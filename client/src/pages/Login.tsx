import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SiGoogle } from "react-icons/si";
import { User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import GlencairnLogo from "@/components/GlencairnLogo";
import PhantomLogo from "@/components/PhantomLogo";
import { usePhantomSafe } from "@/hooks/use-phantom-safe";

const isDev = import.meta.env.DEV;
const phantomEnabled = !!import.meta.env.VITE_PHANTOM_APP_ID;

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, loading, loginWithGoogle, loginWithPhantomSDK, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loggingIn, setLoggingIn] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Phantom SDK hooks - safe wrapper that returns no-ops when Phantom is not enabled
  const { isConnected, user: phantomUser, openModal: openPhantomModal } = usePhantomSafe();

  // Parse returnTo from query string
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("returnTo");
  }, [search]);

  useEffect(() => {
    if (user && !loading) {
      // If already logged in, redirect to returnTo or dashboard
      setLocation(returnTo || "/dashboard");
    }
  }, [user, loading, setLocation, returnTo]);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithGoogle(returnTo || undefined);
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please try again",
        variant: "destructive",
      });
      setLoggingIn(false);
    }
  };

  const handlePhantomLogin = () => {
    // Open the Phantom SDK modal to connect wallet
    openPhantomModal();
  };

  // Effect to handle Phantom SDK connection
  useEffect(() => {
    const completePhantomAuth = async () => {
      if (isConnected && phantomUser && !user) {
        setLoggingIn(true);
        try {
          // Get the Solana address from the connected user
          // Cast to access the solana property from the SDK response
          const userWithSolana = phantomUser as { solana?: { address?: string } };
          const solanaAddress = userWithSolana.solana?.address;
          if (!solanaAddress) {
            throw new Error("No Solana address found");
          }
          
          const { needsSetup } = await loginWithPhantomSDK(solanaAddress);
          if (needsSetup) {
            setLocation("/notification-setup");
          } else if (returnTo) {
            setLocation(returnTo);
          } else {
            setLocation("/dashboard");
          }
        } catch (error) {
          toast({
            title: "Phantom login failed",
            description: error instanceof Error ? error.message : "Please try again",
            variant: "destructive",
          });
          setLoggingIn(false);
        }
      }
    };
    
    completePhantomAuth();
  }, [isConnected, phantomUser, user]);

  const handleDemoLogin = async () => {
    setLoggingIn(true);
    try {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "demo",
          email: "demo@example.com",
          name: "Demo User",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        await refreshUser();
        if (!data.user.seenNotificationSetup) {
          setLocation("/notification-setup");
        } else if (returnTo) {
          setLocation(returnTo);
        } else {
          setLocation("/dashboard");
        }
      } else {
        throw new Error("Demo login failed");
      }
    } catch (error) {
      toast({
        title: "Demo login failed",
        description: "Please try again",
        variant: "destructive",
      });
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GlencairnLogo className="w-10 h-10" />
            <span className="font-serif text-3xl font-bold">BaxPro</span>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-4 font-medium bg-primary/10 text-primary border-primary/20"
            >
              beta
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to manage your spirit alerts</p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-8">
          <div className="flex items-start gap-3 mb-6">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              data-testid="checkbox-agree-terms"
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground leading-tight cursor-pointer"
            >
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button 
              variant="default"
              size="lg"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loggingIn || !agreedToTerms}
              data-testid="button-google-login"
            >
              <SiGoogle className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            {phantomEnabled && (
              <Button 
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handlePhantomLogin}
                disabled={loggingIn || !agreedToTerms}
                data-testid="button-phantom-login"
              >
                <PhantomLogo className="w-5 h-5 mr-2" />
                Continue with Phantom
              </Button>
            )}
            
            {isDev && (
              <Button 
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleDemoLogin}
                disabled={loggingIn || !agreedToTerms}
                data-testid="button-demo-login"
              >
                <User className="w-5 h-5 mr-2" />
                Demo Login (Dev Only)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
