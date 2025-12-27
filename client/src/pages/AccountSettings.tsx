import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Wallet, Crown, RefreshCw } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireAuth();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [baxusWallet, setBaxusWallet] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshingMatches, setRefreshingMatches] = useState(false);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBaxusWallet(user.baxusWallet || "");
    }
  }, [user]);

  const isValidBase58 = (address: string) => {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  };

  const handleSave = async () => {
    if (baxusWallet) {
      if (baxusWallet.length < 32 || baxusWallet.length > 44) {
        toast({
          title: "Invalid wallet address",
          description: "Baxus wallet address must be between 32 and 44 characters",
          variant: "destructive",
        });
        return;
      }
      if (!isValidBase58(baxusWallet)) {
        toast({
          title: "Invalid wallet address",
          description: "Wallet address contains invalid characters",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          displayName: displayName || null,
          baxusWallet: baxusWallet || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update account settings");
      }

      await refreshUser();

      toast({
        title: "Settings saved",
        description: "Your account details have been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshMatches = async () => {
    setRefreshingMatches(true);
    try {
      const response = await fetch("/api/alerts/refresh-all-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh matches");
      }

      const result = await response.json();

      toast({
        title: "Refresh started",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Failed to refresh",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setRefreshingMatches(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GlencairnLogo className="w-6 h-6" />
            <span className="font-serif text-xl font-bold">BaxPro</span>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-4 font-medium bg-primary/10 text-primary border-primary/20"
            >
              beta
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Details</h1>
          <p className="text-muted-foreground">
            Manage your profile information
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your display name and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  Your email is managed through Google sign-in and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter a display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-display-name"
                />
                <p className="text-xs text-muted-foreground">
                  This is how your name will appear on our leaderboards, should you choose to participate in future games.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Baxus Wallet
              </CardTitle>
              <CardDescription>
                Enter your Baxus wallet address for future features!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baxusWallet">Wallet Address</Label>
                <Input
                  id="baxusWallet"
                  type="text"
                  placeholder="Enter your Baxus wallet address"
                  value={baxusWallet}
                  onChange={(e) => setBaxusWallet(e.target.value)}
                  maxLength={44}
                  className="font-mono text-sm"
                  data-testid="input-baxus-wallet"
                />
              </div>
              {baxusWallet && baxusWallet.length > 0 && (baxusWallet.length < 32 || baxusWallet.length > 44) && (
                <p className="text-xs text-destructive">
                  Wallet address must be between 32 and 44 characters ({baxusWallet.length} entered)
                </p>
              )}
              {baxusWallet && baxusWallet.length >= 32 && baxusWallet.length <= 44 && !isValidBase58(baxusWallet) && (
                <p className="text-xs text-destructive">
                  Wallet address contains invalid characters
                </p>
              )}
            </CardContent>
          </Card>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
            data-testid="button-save-account-settings"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>

          {user.isVip && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  VIP Tools
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                    VIP
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Exclusive tools available only to VIP members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Re-run the matching logic on all alerts across all users to find historical matches 
                    from the activity feed. This will update the match count for every alert in the system.
                  </p>
                  <Button 
                    onClick={handleRefreshMatches} 
                    disabled={refreshingMatches}
                    variant="outline"
                    className="w-full"
                    data-testid="button-refresh-matches"
                  >
                    {refreshingMatches ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh All Alert Matches
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center">
            BaxPro is not affiliated with, endorsed by, or connected to baxus.co
          </p>
        </div>
      </main>
    </div>
  );
}
