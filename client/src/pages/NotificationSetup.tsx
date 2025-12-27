import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Mail, AlertCircle, Check } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function NotificationSetup() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [emailConsent, setEmailConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);

  useEffect(() => {
    if (user) {
      setEmailConsent(user.emailConsent || false);
    }
  }, [user]);

  const handleSendTestEmail = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailConsent }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notification settings");
      }

      await fetch("/api/user/complete-notification-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      await refreshUser();

      toast({
        title: "Settings saved",
        description: emailConsent 
          ? "You'll receive email alerts when matching products are found"
          : "You can enable notifications later in settings",
      });

      setLocation("/dashboard");
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

  const handleSkip = async () => {
    try {
      await fetch("/api/user/complete-notification-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await refreshUser();
    } catch (error) {
      console.error("Failed to complete notification setup:", error);
    }
    setLocation("/dashboard");
  };

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
            onClick={handleSkip}
            data-testid="button-skip-notification-setup"
          >
            Skip for now
          </Button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Almost Done!</h1>
          <p className="text-muted-foreground">
            Set up your notification preferences to receive alerts when matching products are found
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  When a product matching your alert criteria appears on Baxus, we'll send you 
                  an email notification so you never miss a bottle. You can always update 
                  your notification preferences later from the dashboard.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Receive alerts at {user?.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="email-consent"
                    checked={emailConsent}
                    onCheckedChange={(checked) => setEmailConsent(checked === true)}
                    data-testid="checkbox-email-consent-setup"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="email-consent"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Send me email notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      You'll receive an email when products matching your alerts become available on Baxus.
                      You can unsubscribe at any time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">Heads up about spam filters</p>
                    <p className="text-muted-foreground mb-3">
                      Emails from <span className="font-mono text-xs">alerts@baxpro.xyz</span> may land in your spam folder. 
                      Send a test email, then mark it as "Not Spam" or star it - and you're all set!
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail || testEmailSent}
                      data-testid="button-send-test-email-setup"
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

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1"
                data-testid="button-save-notification-setup"
              >
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
