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
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function PhoneSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireAuth();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPhoneNumber("");
      setSmsConsent(user.smsConsent || false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with at least 10 digits",
        variant: "destructive",
      });
      return;
    }

    if (!smsConsent) {
      toast({
        title: "Consent required",
        description: "You must agree to receive text messages to save your phone number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, smsConsent }),
      });

      if (!response.ok) {
        throw new Error("Failed to update phone number");
      }

      await refreshUser();

      toast({
        title: "Settings saved",
        description: "Your phone number and preferences have been updated",
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
          <h1 className="text-3xl font-bold mb-2">Phone Settings</h1>
          <p className="text-muted-foreground">
            Manage your phone number and text message preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Text Message Alerts
            </CardTitle>
            <CardDescription>
              Receive instant notifications when matching bourbons are found on Baxus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="input-phone-settings"
              />
              <p className="text-xs text-muted-foreground">
                Enter your phone number including country code (e.g., +1 for US)
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
              <Checkbox
                id="sms-consent"
                checked={smsConsent}
                onCheckedChange={(checked) => setSmsConsent(checked === true)}
                data-testid="checkbox-sms-consent-settings"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="sms-consent"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  I agree to receive text message alerts from BaxPro
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you consent to receive SMS notifications about bourbon availability 
                  matching your alerts. Message and data rates may apply. You can opt out at any time by 
                  unchecking this box.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <p>
                  When a bourbon matching your alert criteria appears on Baxus, we'll send you a text 
                  message with details and a link to purchase. Make sure your phone number is correct 
                  to receive notifications.
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || !smsConsent}
              className="w-full"
              data-testid="button-save-phone-settings"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
