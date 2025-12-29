import rateLimit from "express-rate-limit";
import type { Request } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 10,                     // Max 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  validate: { xForwardedForHeader: false },
});

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,     // 5 minutes
  max: 100,                    // Max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const session = req.session as { userId?: string } | undefined;
    return session?.userId || "anonymous";
  },
  message: { error: "Too many requests, please try again later" },
  validate: { xForwardedForHeader: false },
});

export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                      // Max 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const session = req.session as { userId?: string } | undefined;
    return session?.userId || "anonymous";
  },
  message: { error: "Too many test emails sent. Please try again in an hour" },
  validate: { xForwardedForHeader: false },
});
