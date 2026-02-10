import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  environment: string;
  loginWithGoogle: (returnTo?: string) => Promise<void>;
  loginWithPhantom: () => Promise<{ user: User; needsSetup: boolean }>;
  loginWithPhantomSDK: (publicKey: string, signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>) => Promise<{ user: User; needsSetup: boolean }>;
  loginDemo: (provider: string, email: string, name?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState("production");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.environment) {
        setEnvironment(data.environment);
      }
      if (response.ok) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (returnTo?: string) => {
    const url = returnTo 
      ? `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`
      : "/api/auth/google";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to get Google auth URL");
    }
    const data = await response.json();
    window.location.href = data.url;
  };

  const loginWithPhantom = async (): Promise<{ user: User; needsSetup: boolean }> => {
    // Check if Phantom is installed
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      throw new Error("Phantom wallet not found. Please install it from phantom.app");
    }

    // Connect to Phantom
    const connectResponse = await phantom.connect();
    const publicKey = connectResponse.publicKey.toString();

    // Get challenge message from server
    const challengeResponse = await fetch("/api/auth/phantom/challenge");
    if (!challengeResponse.ok) {
      throw new Error("Failed to get challenge");
    }
    const { message } = await challengeResponse.json();

    // Sign the message
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await phantom.signMessage(encodedMessage, "utf8");
    
    // Convert signature to base58
    const toBase58 = (bytes: Uint8Array): string => {
      const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      const byteArray = Array.from(bytes);
      let num = BigInt(0);
      for (let i = 0; i < byteArray.length; i++) {
        num = num * BigInt(256) + BigInt(byteArray[i]);
      }
      let result = "";
      while (num > 0) {
        result = chars[Number(num % BigInt(58))] + result;
        num = num / BigInt(58);
      }
      // Handle leading zeros
      for (let i = 0; i < byteArray.length; i++) {
        if (byteArray[i] === 0) result = "1" + result;
        else break;
      }
      return result || "1";
    };

    const signature = toBase58(signedMessage.signature);
    
    // Verify with server
    const verifyResponse = await fetch("/api/auth/phantom/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey,
        signature,
        message,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || "Authentication failed");
    }

    const data = await verifyResponse.json();
    setUser(data.user);
    return { user: data.user, needsSetup: data.needsSetup };
  };

  // Login with Phantom SDK - uses SDK's connection, then verifies with backend
  const loginWithPhantomSDK = async (
    publicKey: string, 
    signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>
  ): Promise<{ user: User; needsSetup: boolean }> => {
    // Get challenge message from server
    const challengeResponse = await fetch("/api/auth/phantom/challenge");
    if (!challengeResponse.ok) {
      throw new Error("Failed to get challenge");
    }
    const { message } = await challengeResponse.json();

    // Sign the message with Phantom SDK
    const encodedMessage = new TextEncoder().encode(message);
    const signedResult = await signMessage(encodedMessage);
    
    // Convert signature to base58
    const toBase58 = (bytes: Uint8Array): string => {
      const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      const byteArray = Array.from(bytes);
      let num = BigInt(0);
      for (let i = 0; i < byteArray.length; i++) {
        num = num * BigInt(256) + BigInt(byteArray[i]);
      }
      let result = "";
      while (num > 0) {
        result = chars[Number(num % BigInt(58))] + result;
        num = num / BigInt(58);
      }
      // Handle leading zeros
      for (let i = 0; i < byteArray.length; i++) {
        if (byteArray[i] === 0) result = "1" + result;
        else break;
      }
      return result || "1";
    };

    const signature = toBase58(signedResult.signature);
    
    // Verify with server
    const response = await fetch("/api/auth/phantom/sdk-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, signature, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Authentication failed");
    }

    const data = await response.json();
    setUser(data.user);
    return { user: data.user, needsSetup: data.needsSetup };
  };

  const loginDemo = async (provider: string, email: string, name?: string) => {
    const response = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, email, name }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, environment, loginWithGoogle, loginWithPhantom, loginWithPhantomSDK, loginDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
