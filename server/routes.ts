import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAlertSchema } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { PubSub } from "@google-cloud/pubsub";
import { generateDisplayName } from "./data/nameGenerator";
import crypto from "crypto";
import { authLimiter, apiLimiter, emailLimiter } from "./rateLimit";
import nacl from "tweetnacl";
import bs58 from "bs58";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthCsrfToken?: string;
  }
}

function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  // Must be app-relative, not protocol-relative or absolute URL
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  // Block any attempt to include a protocol
  if (/^\/[^/]*:/.test(path)) return false;
  // Allow common URL characters but block dangerous patterns
  if (!/^\/[\w\-.~/%]+(?:\?[\w\-.~=&%]*)?(?:#[\w\-.~]*)?$/.test(path)) return false;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Google OAuth client
  // Use CUSTOM_DOMAIN env var to support both production (baxpro.xyz) and dev (dev.baxpro.xyz)
  let redirectUri: string;
  if (process.env.CUSTOM_DOMAIN) {
    redirectUri = `https://${process.env.CUSTOM_DOMAIN}/api/auth/google/callback`;
  } else if (process.env.REPLIT_DOMAINS) {
    redirectUri = `https://${process.env.REPLIT_DOMAINS}/api/auth/google/callback`;
  } else {
    redirectUri = "http://localhost:5000/api/auth/google/callback";
  }
  console.log("OAuth redirect URI:", redirectUri);
  
  const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // Session middleware - use PostgreSQL store for persistence
  const isProduction = process.env.NODE_ENV === "production";
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      }),
      secret: process.env.SESSION_SECRET || "bourbon-alert-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      },
    })
  );
  console.log("Using PostgreSQL session store");

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // VIP middleware - requires authentication AND VIP status
  const requireVip = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user?.isVip) {
      return res.status(403).json({ error: "VIP access required" });
    }
    next();
  };

  // System version endpoint (unauthenticated for deployment verification)
  app.get("/api/system/version", (req, res) => {
    res.json({
      version: process.env.DEPLOY_VERSION || "dev",
      deployedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  app.get("/read-me", (req, res) => {
    res.redirect("https://github.com/0xtom1/baxpro#readme");
  });

  // Google OAuth routes
  app.get("/api/auth/google", authLimiter, (req, res) => {
    const returnTo = req.query.returnTo as string | undefined;
    
    // Generate a cryptographically secure CSRF token and store in session
    const csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.oauthCsrfToken = csrfToken;
    
    // Include CSRF token and optional returnTo in state parameter
    const statePayload = { csrfToken, returnTo };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    
    const authUrl = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      state,
    });
    res.json({ url: authUrl });
  });

  app.get("/api/auth/google/callback", authLimiter, async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== "string") {
        return res.redirect("/?error=no_code");
      }

      // Parse and validate the state parameter for CSRF protection
      let returnTo: string | undefined;
      if (!state || typeof state !== "string") {
        console.error("OAuth callback: missing state parameter");
        return res.redirect("/?error=invalid_state");
      }
      
      let statePayload: { csrfToken?: string; returnTo?: string };
      try {
        statePayload = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        console.error("OAuth callback: malformed state parameter");
        return res.redirect("/?error=invalid_state");
      }
      
      // Validate CSRF token matches session
      const storedToken = req.session.oauthCsrfToken;
      if (!storedToken || !statePayload.csrfToken || storedToken !== statePayload.csrfToken) {
        console.error("OAuth callback: CSRF token mismatch");
        return res.redirect("/?error=csrf_validation_failed");
      }
      
      // Clear the used CSRF token
      delete req.session.oauthCsrfToken;
      
      returnTo = statePayload.returnTo;

      // Exchange code for tokens
      const { tokens } = await googleClient.getToken(code);
      googleClient.setCredentials(tokens);

      // Get user info
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        return res.redirect("/?error=no_email");
      }

      // Check if user exists
      let user = await storage.getUserByEmail(payload.email);
      
      if (!user) {
        // Create new user with random display name
        user = await storage.createUser({
          email: payload.email,
          name: payload.name || null,
          displayName: generateDisplayName(),
          provider: "google",
          providerId: payload.sub,
        });
      }

      // Update last login timestamp
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      req.session.userId = user.id;
      
      // Redirect to original page, dashboard, or notification setup
      if (!user.seenNotificationSetup) {
        res.redirect("/notification-setup");
      } else if (isSafeReturnPath(returnTo)) {    
        // Validate returnTo is a safe, app-relative path
        res.redirect(returnTo);
      } else {
        res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Google OAuth error - FULL DETAILS:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.redirect("/?error=oauth_failed");
    }
  });

  // Demo auth routes - DISABLED ON ALL DEPLOYMENTS for security
  // This endpoint allows login without OAuth verification
  // Only works in local Replit development environment
  app.post("/api/auth/demo-login", authLimiter, async (req, res) => {
    // Only allow in local Replit development (not deployed anywhere - dev or prod)
    if (process.env.REPLIT_DEPLOYMENT) {
      return res.status(403).json({ error: "Demo login is only available in local development" });
    }

    try {
      const { provider, email, name } = req.body;
      
      if (!provider || !email) {
        return res.status(400).json({ error: "Provider and email required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user with random display name
        user = await storage.createUser({
          email,
          name: name || null,
          displayName: generateDisplayName(),
          provider,
          providerId: `demo-${Date.now()}`,
        });
      }

      // Update last login timestamp
      user = await storage.updateUser(user.id, { lastLoginAt: new Date() }) || user;

      req.session.userId = user.id;
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Phantom Demo auth route - DISABLED ON ALL DEPLOYMENTS for security
  // This endpoint allows Phantom wallet login without actual wallet verification
  // Only works in local Replit development environment
  app.post("/api/auth/phantom-demo-login", authLimiter, async (req, res) => {
    // Only allow in local Replit development (not deployed anywhere - dev or prod)
    if (process.env.REPLIT_DEPLOYMENT) {
      return res.status(403).json({ error: "Phantom demo login is only available in local development" });
    }

    try {
      const phantomWallet = "bTQNircppiYgRwauQn8h2YMMBgoLBnRPankwMaPtyFB";
      
      // Check if user exists with this wallet
      let user = await storage.getUserByPhantomWallet(phantomWallet);
      
      if (!user) {
        // Create new user with phantom wallet
        user = await storage.createUser({
          email: null,
          name: "Phantom Demo User",
          displayName: generateDisplayName(),
          provider: "phantom",
          providerId: `phantom-demo-${phantomWallet}`,
          phantomWallet,
        });
      }

      // Update last login timestamp
      user = await storage.updateUser(user.id, { lastLoginAt: new Date() }) || user;

      req.session.userId = user.id;
      res.json({ user });
    } catch (error) {
      console.error("Phantom demo login error:", error);
      res.status(500).json({ error: "Phantom demo login failed" });
    }
  });

  // Phantom Wallet authentication
  // Step 1: Get a challenge message to sign
  app.get("/api/auth/phantom/challenge", authLimiter, (req, res) => {
    const nonce = crypto.randomBytes(32).toString('hex');
    const message = `Sign this message to authenticate with BaxPro.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
    
    // Store nonce in session for verification
    req.session.oauthCsrfToken = nonce;
    
    res.json({ message, nonce });
  });

  // Step 2: Verify signature and authenticate
  app.post("/api/auth/phantom/verify", authLimiter, async (req, res) => {
    try {
      const verifySchema = z.object({
        publicKey: z.string().min(32).max(44),
        signature: z.string(),
        message: z.string(),
      });

      const { publicKey, signature, message } = verifySchema.parse(req.body);

      // Verify the signature
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Check if user exists by phantom wallet
      let user = await storage.getUserByPhantomWallet(publicKey);
      
      if (!user) {
        // Create new user with phantom wallet
        user = await storage.createUser({
          email: null,
          name: null,
          displayName: generateDisplayName(),
          phantomWallet: publicKey,
          provider: "phantom",
          providerId: publicKey,
        });
      }

      // Update last login timestamp
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      req.session.userId = user.id;
      
      // Check if user needs notification setup
      const needsSetup = !user.seenNotificationSetup;
      
      res.json({ user, needsSetup });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Phantom auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Phantom SDK authentication - requires signature verification for security
  app.post("/api/auth/phantom/sdk-login", authLimiter, async (req, res) => {
    try {
      const sdkLoginSchema = z.object({
        publicKey: z.string().min(32).max(44),
        signature: z.string(),
        message: z.string(),
      });

      const { publicKey, signature, message } = sdkLoginSchema.parse(req.body);

      // Verify the signature to prove wallet ownership
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Check if user exists by phantom wallet
      let user = await storage.getUserByPhantomWallet(publicKey);
      
      if (!user) {
        // Create new user with phantom wallet
        user = await storage.createUser({
          email: null,
          name: null,
          displayName: generateDisplayName(),
          phantomWallet: publicKey,
          provider: "phantom",
          providerId: publicKey,
        });
      }

      // Update last login timestamp
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      req.session.userId = user.id;
      
      // Check if user needs notification setup
      const needsSetup = !user.seenNotificationSetup;
      
      res.json({ user, needsSetup });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Phantom SDK auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", authLimiter, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", authLimiter, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    // Update lastLoginAt if more than 5 minutes since last update
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastLoginAt || user.lastLoginAt < fiveMinutesAgo) {
      user = await storage.updateUser(user.id, { lastLoginAt: new Date() }) || user;
    }

    res.json({ user });
  });

  // User routes
  
  // Complete notification setup (mark as seen)
  app.post("/api/user/complete-notification-setup", requireAuth, apiLimiter, async (req, res) => {
    try {
      const user = await storage.updateUser(req.session.userId!, { 
        seenNotificationSetup: true 
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Complete notification setup error:", error);
      res.status(500).json({ error: "Failed to complete notification setup" });
    }
  });

  app.patch("/api/user/notifications", requireAuth, apiLimiter, async (req, res) => {
    try {
      const notificationSchema = z.object({
        emailConsent: z.boolean().optional(),
      });

      const data = notificationSchema.parse(req.body);
      
      const user = await storage.updateUser(req.session.userId!, data);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update notifications error:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  app.patch("/api/user/account", requireAuth, apiLimiter, async (req, res) => {
    try {
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const accountSchema = z.object({
        displayName: z.string().nullable().optional(),
        baxusWallet: z.string().min(32).max(44).regex(base58Regex, "Invalid wallet address format").nullable().optional().or(z.literal(null)),
        email: z.string().regex(emailRegex, "Invalid email format").nullable().optional(),
      });

      const data = accountSchema.parse(req.body);
      
      // Get current user to check if they can update email
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only allow email updates for users who signed in with Phantom wallet (provider === 'phantom')
      const updateData: { displayName?: string | null; baxusWallet?: string | null; email?: string | null } = {
        displayName: data.displayName,
        baxusWallet: data.baxusWallet,
      };
      
      // Allow email update only for Phantom wallet users (not Google OAuth users)
      if (currentUser.provider === 'phantom' && data.email !== undefined) {
        updateData.email = data.email;
      }
      
      const user = await storage.updateUser(req.session.userId!, updateData);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update account error:", error);
      res.status(500).json({ error: "Failed to update account settings" });
    }
  });

  app.delete("/api/user/account", requireAuth, apiLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Account deleted but failed to end session. Please clear your cookies." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Unsubscribe route (no auth required - called from email links)
  // UUID user IDs are random and unguessable, providing sufficient security
  app.post("/api/unsubscribe", async (req, res) => {
    try {
      const unsubscribeSchema = z.object({
        userId: z.string().uuid(),
      });

      const { userId } = unsubscribeSchema.parse(req.body);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(userId, { emailConsent: false });
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid unsubscribe link" });
      }
      console.error("Unsubscribe error:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Send test email - publishes to Pub/Sub for alert-sender to process
  app.post("/api/notifications/test-email", requireAuth, emailLimiter, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Determine topic name based on environment
      // In GCP: PUBSUB_TOPIC_PREFIX is set (e.g., "alert-matches-production")
      // In dev/Replit: Skip Pub/Sub, just return success for testing
      const topicName = process.env.PUBSUB_TOPIC_ALERT_MATCHES;
      
      if (!topicName) {
        // Dev environment - no Pub/Sub configured
        console.log("[Test Email] Pub/Sub not configured, skipping (dev mode)");
        return res.json({ 
          success: true, 
          message: "Test email request received (Pub/Sub not configured in dev)" 
        });
      }

      // Initialize Pub/Sub client (uses ADC in GCP)
      const pubsub = new PubSub();
      const topic = pubsub.topic(topicName);

      // Create the message payload
      const payload = {
        user_id: user.id,
        user_email: user.email,
      };

      // Publish with event_type attribute
      const messageId = await topic.publishMessage({
        data: Buffer.from(JSON.stringify(payload)),
        attributes: {
          event_type: "user_example",
        },
      });

      console.log(`[Test Email] Published message ${messageId} for user ${user.id}`);
      
      res.json({ success: true, messageId });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Alert routes
  app.get("/api/alerts", requireAuth, apiLimiter, async (req, res) => {
    try {
      const alerts = await storage.getAlertsByUserId(req.session.userId!);
      res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", requireAuth, apiLimiter, async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      const alert = await storage.createAlert(validatedData);
      
      // Match alert to existing assets (run in background, don't block response)
      storage.matchAlertToAssets(alert.id).catch(err => {
        console.error("Error matching alert to assets:", err);
      });
      
      res.json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create alert error:", error);
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.patch("/api/alerts/:id", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check ownership
      const existing = await storage.getAlert(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Alert not found" });
      }

      const updateData = insertAlertSchema.partial().omit({ userId: true }).parse(req.body);
      const alert = await storage.updateAlert(id, updateData);
      
      // Re-match alert to assets after update (run in background)
      storage.matchAlertToAssets(id).catch(err => {
        console.error("Error matching alert to assets:", err);
      });
      
      res.json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update alert error:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.delete("/api/alerts/:id", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check ownership
      const existing = await storage.getAlert(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Alert not found" });
      }

      await storage.deleteAlert(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete alert error:", error);
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Refresh all alert matches for all users (VIP only)
  app.post("/api/alerts/refresh-all-matches", requireVip, apiLimiter, async (req, res) => {
    try {
      const allAlerts = await storage.getAllAlerts();
      
      // Return immediately, run matching in background
      res.json({ 
        success: true, 
        message: "Refreshing matches for alerts across all users"
      });
      
      // Run matching for all alerts in background
      for (const alert of allAlerts) {
        storage.matchAlertToAssets(alert.id).catch(err => {
          console.error(`Error matching alert ${alert.id} to assets:`, err);
        });
      }
    } catch (error) {
      console.error("Refresh all matches error:", error);
      res.status(500).json({ error: "Failed to refresh matches" });
    }
  });

  // Refresh brands list materialized view (VIP only)
  app.post("/api/refresh-brands-list", requireVip, apiLimiter, async (req, res) => {
    try {
      await storage.refreshBrandsListView();
      res.json({ success: true, message: "Brands list view refreshed" });
    } catch (error) {
      console.error("Refresh brands list error:", error);
      res.status(500).json({ error: "Failed to refresh brands list" });
    }
  });

  // Activity types endpoint (for filter dropdown)
  app.get("/api/activity-types", requireAuth, apiLimiter, async (req, res) => {
    try {
      const types = await storage.getActivityTypes();
      res.json(types);
    } catch (error) {
      console.error("Get activity types error:", error);
      res.status(500).json({ error: "Failed to fetch activity types" });
    }
  });

  // Activity feed route (requires authentication)
  app.get("/api/activity", requireAuth, apiLimiter, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const activityTypeCode = req.query.type as string | undefined;
      const offset = (page - 1) * limit;
      
      const [activities, totalCount] = await Promise.all([
        storage.getActivityFeed(limit, offset, activityTypeCode),
        storage.getActivityFeedCount(activityTypeCode)
      ]);
      
      res.json({
        data: activities,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Get activity feed error:", error);
      res.status(500).json({ error: "Failed to fetch activity feed" });
    }
  });

  // Asset details by index route (requires authentication) - must come before :assetId route
  app.get("/api/assets/idx/:assetIdx", requireAuth, apiLimiter, async (req, res) => {
    try {
      const assetIdx = parseInt(req.params.assetIdx, 10);
      if (isNaN(assetIdx)) {
        return res.status(400).json({ error: "Invalid asset index" });
      }
      const asset = await storage.getAssetByAssetIdx(assetIdx);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json(asset);
    } catch (error) {
      console.error("Get asset by idx error:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Asset details route (requires authentication)
  app.get("/api/assets/:assetId", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { assetId } = req.params;
      const asset = await storage.getAssetByAssetId(assetId);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json(asset);
    } catch (error) {
      console.error("Get asset error:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Brand page endpoints (for v_asset_summary brand names)
  app.get("/api/brand-names", requireAuth, apiLimiter, async (req, res) => {
    try {
      const brands = await storage.getBrandNames();
      res.json(brands);
    } catch (error) {
      console.error("Get brand names error:", error);
      res.status(500).json({ error: "Failed to fetch brand names" });
    }
  });

  app.get("/api/brands-list", requireAuth, apiLimiter, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const result = await storage.getBrandsList(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Get brands list error:", error);
      res.status(500).json({ error: "Failed to fetch brands list" });
    }
  });

  app.get("/api/brand", requireAuth, apiLimiter, async (req, res) => {
    try {
      const brandName = req.query.name as string;
      if (!brandName) {
        return res.status(400).json({ error: "Brand name is required" });
      }

      const traitFilters: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (key.startsWith('trait_') && value) {
          const traitType = key.replace('trait_', '');
          // Normalize ParsedQs values to plain strings
          if (Array.isArray(value)) {
            traitFilters[traitType] = value.map(v => String(v));
          } else if (typeof value === 'object') {
            // Handle ParsedQs object (e.g., {'0': 'value'})
            traitFilters[traitType] = Object.values(value).map(v => String(v));
          } else {
            traitFilters[traitType] = [String(value)];
          }
        }
      }

      const [assets, stats, traits, activity] = await Promise.all([
        storage.getBrandAssets(brandName, Object.keys(traitFilters).length > 0 ? traitFilters : undefined),
        storage.getBrandStats(brandName),
        storage.getBrandTraits(brandName),
        storage.getBrandActivity(brandName, 50),
      ]);

      res.json({ brandName, assets, stats, traits, activity });
    } catch (error) {
      console.error("Get brand error:", error);
      res.status(500).json({ error: "Failed to fetch brand data" });
    }
  });

  // My Bottles endpoints - fetch user's wallet NFTs matched to Baxus assets
  app.get("/api/my-bottles", requireAuth, apiLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Use phantomWallet first, then baxusWallet as fallback
      const walletAddress = user?.phantomWallet || user?.baxusWallet;
      
      if (!walletAddress) {
        return res.json({ assets: [], hasWallet: false });
      }

      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (!heliusApiKey) {
        console.error("HELIUS_API_KEY not configured");
        return res.status(500).json({ error: "NFT service not configured" });
      }

      // Fetch NFTs from Helius API (devnet for dev, mainnet for production)
      const heliusNetwork = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';
      const heliusUrl = `https://${heliusNetwork}.helius-rpc.com/?api-key=${heliusApiKey}`;
      const heliusResponse = await fetch(heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-bottles',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
            options: {
              showFungible: true,
              showNativeBalance: false,
            }
          }
        })
      });

      if (!heliusResponse.ok) {
        console.error("Helius API error:", heliusResponse.status);
        return res.status(500).json({ error: "Failed to fetch wallet NFTs" });
      }

      const heliusData = await heliusResponse.json();
      const walletAssetIds = (heliusData.result?.items || []).map((item: any) => item.id);

      if (walletAssetIds.length === 0) {
        return res.json({ assets: [], hasWallet: true });
      }

      // Match wallet NFTs to Baxus assets
      const matchedAssets = await storage.getAssetsByAssetIds(walletAssetIds);
      
      res.json({ assets: matchedAssets, hasWallet: true });
    } catch (error) {
      console.error("Get my NFTs error:", error);
      res.status(500).json({ error: "Failed to fetch your NFTs" });
    }
  });

  app.get("/api/my-bottles/:assetId", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { assetId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      // Use phantomWallet first, then baxusWallet as fallback
      const walletAddress = user?.phantomWallet || user?.baxusWallet;

      if (!walletAddress) {
        return res.status(403).json({ error: "No wallet connected" });
      }

      // Verify ownership: check that this asset is in the user's wallet
      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (!heliusApiKey) {
        return res.status(500).json({ error: "NFT service not configured" });
      }

      // Use devnet for dev, mainnet for production
      const heliusNetwork = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';
      const heliusUrl = `https://${heliusNetwork}.helius-rpc.com/?api-key=${heliusApiKey}`;
      const heliusResponse = await fetch(heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'verify-ownership',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
            options: { showFungible: true, showNativeBalance: false }
          }
        })
      });

      if (!heliusResponse.ok) {
        return res.status(500).json({ error: "Failed to verify ownership" });
      }

      const heliusData = await heliusResponse.json();
      const walletAssetIds = (heliusData.result?.items || []).map((item: any) => item.id);

      if (!walletAssetIds.includes(assetId)) {
        return res.status(404).json({ error: "Asset not found in your wallet" });
      }
      
      const asset = await storage.getAssetSummaryByAssetId(assetId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found in Baxus" });
      }

      // Get full asset data including metadata
      const fullAsset = await storage.getAssetByAssetId(assetId);
      const activity = await storage.getAssetActivityByAssetIdx(asset.assetIdx, 50);

      res.json({ 
        asset: {
          ...asset,
          metadataJson: fullAsset?.metadataJson,
          assetJson: fullAsset?.assetJson,
        }, 
        activity 
      });
    } catch (error) {
      console.error("Get NFT detail error:", error);
      res.status(500).json({ error: "Failed to fetch NFT details" });
    }
  });

  // Product hierarchy endpoints (VIP only)
  app.get("/api/producers", requireVip, apiLimiter, async (req, res) => {
    try {
      const producers = await storage.getProducers();
      res.json(producers);
    } catch (error) {
      console.error("Get producers error:", error);
      res.status(500).json({ error: "Failed to fetch producers" });
    }
  });

  app.get("/api/brands/:producerIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const producerIdx = parseInt(req.params.producerIdx, 10);
      if (isNaN(producerIdx)) {
        return res.status(400).json({ error: "Invalid producer index" });
      }
      const brands = await storage.getBrandsByProducer(producerIdx);
      res.json(brands);
    } catch (error) {
      console.error("Get brands error:", error);
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.get("/api/sub-brands/:brandIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const brandIdx = parseInt(req.params.brandIdx, 10);
      if (isNaN(brandIdx)) {
        return res.status(400).json({ error: "Invalid brand index" });
      }
      const subBrands = await storage.getSubBrandsByBrand(brandIdx);
      res.json(subBrands);
    } catch (error) {
      console.error("Get sub-brands error:", error);
      res.status(500).json({ error: "Failed to fetch sub-brands" });
    }
  });

  app.get("/api/brand-hierarchy", requireVip, apiLimiter, async (req, res) => {
    try {
      const producerIdx = req.query.producerIdx ? parseInt(req.query.producerIdx as string, 10) : undefined;
      const brandIdx = req.query.brandIdx ? parseInt(req.query.brandIdx as string, 10) : undefined;
      const subBrandIdx = req.query.subBrandIdx ? parseInt(req.query.subBrandIdx as string, 10) : undefined;
      
      const hierarchy = await storage.getBrandHierarchy(producerIdx, brandIdx, subBrandIdx);
      res.json(hierarchy);
    } catch (error) {
      console.error("Get brand hierarchy error:", error);
      res.status(500).json({ error: "Failed to fetch brand hierarchy" });
    }
  });

  app.patch("/api/brands/:brandIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const brandIdx = parseInt(req.params.brandIdx, 10);
      if (isNaN(brandIdx)) {
        return res.status(400).json({ error: "Invalid brand index" });
      }
      const { brandName } = req.body;
      if (!brandName || typeof brandName !== "string") {
        return res.status(400).json({ error: "Brand name is required" });
      }
      const result = await storage.updateBrandName(brandIdx, brandName.trim());
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update brand error:", error);
      res.status(500).json({ error: "Failed to update brand" });
    }
  });

  app.patch("/api/sub-brands/:subBrandIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const subBrandIdx = parseInt(req.params.subBrandIdx, 10);
      if (isNaN(subBrandIdx)) {
        return res.status(400).json({ error: "Invalid sub-brand index" });
      }
      const { subBrandName } = req.body;
      const result = await storage.updateSubBrandName(subBrandIdx, subBrandName?.trim() || null);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update sub-brand error:", error);
      res.status(500).json({ error: "Failed to update sub-brand" });
    }
  });

  app.patch("/api/brands/:brandIdx/review", requireVip, apiLimiter, async (req, res) => {
    try {
      const brandIdx = parseInt(req.params.brandIdx, 10);
      if (isNaN(brandIdx)) {
        return res.status(400).json({ error: "Invalid brand index" });
      }
      const { reviewed, reviewedBy } = req.body;
      await storage.setBrandReviewStatus(brandIdx, reviewed ? reviewedBy : null);
      res.json({ success: true });
    } catch (error) {
      console.error("Update brand review error:", error);
      res.status(500).json({ error: "Failed to update review status" });
    }
  });

  app.get("/api/brand-details/:brandIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const brandIdx = parseInt(req.params.brandIdx, 10);
      if (isNaN(brandIdx)) {
        return res.status(400).json({ error: "Invalid brand index" });
      }
      const result = await storage.getBrandWithSubBrands(brandIdx);
      if (!result) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Get brand details error:", error);
      res.status(500).json({ error: "Failed to fetch brand details" });
    }
  });

  app.post("/api/move-bottles", requireVip, apiLimiter, async (req, res) => {
    try {
      const { fromSubBrandIdx, toSubBrandIdx } = req.body;
      if (!fromSubBrandIdx || !toSubBrandIdx) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (fromSubBrandIdx === toSubBrandIdx) {
        return res.status(400).json({ error: "Source and destination must be different" });
      }
      const movedCount = await storage.moveBottlesToSubBrand(
        parseInt(fromSubBrandIdx, 10),
        parseInt(toSubBrandIdx, 10)
      );
      res.json({ success: true, movedCount });
    } catch (error) {
      console.error("Move bottles error:", error);
      res.status(500).json({ error: "Failed to move bottles" });
    }
  });

  app.get("/api/sub-brand-assets/:subBrandIdx", requireVip, apiLimiter, async (req, res) => {
    try {
      const subBrandIdx = parseInt(req.params.subBrandIdx, 10);
      if (isNaN(subBrandIdx)) {
        return res.status(400).json({ error: "Invalid sub-brand index" });
      }
      const result = await storage.getSubBrandWithAssets(subBrandIdx);
      if (!result) {
        return res.status(404).json({ error: "Sub-brand not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Get sub-brand assets error:", error);
      res.status(500).json({ error: "Failed to fetch sub-brand assets" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
