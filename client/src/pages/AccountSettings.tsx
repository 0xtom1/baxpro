import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Wallet, Trash2, Bell, Mail, AlertCircle, Check } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireAuth();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [baxusWallet, setBaxusWallet] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Notification settings state
  const [emailConsent, setEmailConsent] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  
  // Check if user logged in with Phantom wallet
  const hasPhantomWallet = !!user?.phantomWallet;
  // Check if email can be edited - only for users who signed in with Phantom (provider === 'phantom')
  // Users who signed in with Google OAuth cannot edit their email
  const canEditEmail = user?.provider === 'phantom';
  // Check if user has an email for notifications
  const hasEmail = !!user?.email;

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setBaxusWallet(user.baxusWallet || "");
      setEmailConsent(user.emailConsent || false);
    }
  }, [user]);

  const handleSendTestEmail = async () => {
    if (!hasEmail) {
      toast({
        title: "Email required",
        description: "Please add an email address first",
        variant: "destructive",
      });
      return;
    }
    
    setSendingTestEmail(true);
    try {
      const response = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to send test email");
      }

      setTestEmailSent(true);
      toast({
        title: "Test email sent!",
        description: "Check your inbox (and spam folder) for an email from alerts@baxpro.xyz",
      });
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!hasEmail) {
      toast({
        title: "Email required",
        description: "Please add an email address first to enable notifications",
        variant: "destructive",
      });
      return;
    }
    
    setSavingNotifications(true);
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailConsent }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notification settings");
      }

      await refreshUser();

      toast({
        title: "Notification settings saved",
        description: "Your preferences have been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const isValidBase58 = (address: string) => {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  };

  const isValidEmail = (emailStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
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

    // Validate email for wallet users if they're setting one
    if (canEditEmail && email && !isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: { displayName: string | null; baxusWallet: string | null; email?: string | null } = { 
        displayName: displayName || null,
        baxusWallet: baxusWallet || null,
      };
      
      // Only include email in update for wallet users
      if (canEditEmail) {
        updateData.email = email || null;
      }

      const response = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      });

      setLocation("/");
    } catch (error) {
      toast({
        title: "Failed to delete account",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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
                {canEditEmail ? (
                  <>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email for notifications"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      {email ? "Your email for notifications." : "Add your email to receive alert notifications."}
                    </p>
                    {email && !isValidEmail(email) && (
                      <p className="text-xs text-destructive">
                        Please enter a valid email address
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-muted"
                      data-testid="input-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your email is managed through Google sign-in and cannot be changed here.
                    </p>
                  </>
                )}
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

          {hasPhantomWallet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Connected Wallet
                </CardTitle>
                <CardDescription>
                  Your Phantom wallet used to sign in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Phantom Wallet Address</Label>
                  <Input
                    value={user.phantomWallet || ""}
                    disabled
                    className="bg-muted font-mono text-sm"
                    data-testid="input-phantom-wallet"
                  />
                </div>
              </CardContent>
            </Card>
          )}

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
            {saving ? "Saving..." : "Save Account Settings"}
          </Button>

          <div className="pt-6 border-t border-border">
            <h2 className="text-2xl font-bold mb-2">Notification Settings</h2>
            <p className="text-muted-foreground mb-6">
              Choose how you want to be notified when matching products are found
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                {hasEmail 
                  ? `Receive alerts at ${user?.email}` 
                  : "Add an email address above to receive notifications"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-start space-x-3 p-4 border rounded-lg ${hasEmail ? 'bg-muted/50' : 'bg-muted/20 opacity-60'}`}>
                <Checkbox
                  id="email-consent"
                  checked={emailConsent}
                  onCheckedChange={(checked) => setEmailConsent(checked === true)}
                  disabled={!hasEmail}
                  data-testid="checkbox-email-consent"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="email-consent"
                    className={`text-sm font-medium leading-none ${hasEmail ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    Send me email notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {hasEmail 
                      ? "You'll receive an email when products matching your alerts become available on Baxus. You can unsubscribe at any time."
                      : "Please add an email address in the Profile section above to enable email notifications."}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-lg border ${hasEmail ? 'bg-amber-500/10 border-amber-500/20' : 'bg-muted/20 border-muted opacity-60'}`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasEmail ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`} />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">
                    {hasEmail ? 'Heads up about spam filters' : 'Email required'}
                  </p>
                  <p className="text-muted-foreground mb-3">
                    {hasEmail 
                      ? <>Emails from <span className="font-mono text-xs">alerts@baxpro.xyz</span> may land in your spam folder. Send a test email, then mark it as "Not Spam" or star it - and you're all set!</>
                      : 'Add an email address in the Profile section above to send a test email.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={!hasEmail || sendingTestEmail || testEmailSent}
                    data-testid="button-send-test-email"
                  >
                    {testEmailSent ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {sendingTestEmail ? "Sending..." : testEmailSent ? "Sent!" : "Send Test Email"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSaveNotifications} 
            disabled={savingNotifications || !hasEmail}
            className="w-full"
            data-testid="button-save-notification-settings"
          >
            {savingNotifications ? "Saving..." : "Save Notification Settings"}
          </Button>

          <div className="pt-8 border-t border-border">
            <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. All your alerts and data will be permanently removed.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers, including all your alerts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    {deleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            BaxPro is not affiliated with, endorsed by, or connected to baxus.co
          </p>
        </div>
      </main>
    </div>
  );
}
