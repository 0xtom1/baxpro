import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import notificationSettingsImage from "@assets/notificationsettings_1764650196345.png";

export default function OptInProof() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
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
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">SMS Opt-In Documentation</h1>
        <p className="text-muted-foreground mb-8">
          Evidence of user consent collection for SMS notifications - A2P 10DLC Compliance
        </p>

        <div className="space-y-8">
          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Brand Information</h2>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Brand Name:</strong> BaxPro</p>
              <p><strong>Website:</strong> <a href="https://baxpro.xyz" className="text-primary hover:underline">https://baxpro.xyz</a></p>
              <p><strong>Service Description:</strong> Product availability alert service that monitors Baxus.co and notifies users via SMS when products matching their custom criteria become available.</p>
              <p><strong>Message Type:</strong> Transactional alerts only (no marketing or promotional messages)</p>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Opt-In Method: Web Form</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                BaxPro uses a <strong>single opt-in method</strong>: web form consent collected through our website at{" "}
                <a href="https://baxpro.xyz" className="text-primary hover:underline">baxpro.xyz</a>.
              </p>
              <p>
                Users must complete the following steps to opt in to SMS notifications:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  <strong>Agree to Terms of Service and Privacy Policy</strong> - Before creating an account, 
                  users must check a mandatory checkbox confirming they agree to our{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                </li>
                <li>Create an account via Google OAuth authentication</li>
                <li>Navigate to Notification Settings or Phone Setup page</li>
                <li>Enter their US mobile phone number</li>
                <li>Check the SMS consent checkbox (shown below)</li>
                <li>Click "Save Settings" to submit their consent</li>
              </ol>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Terms of Service Agreement (Login Page)</h2>
            <p className="text-muted-foreground mb-4">
              Before users can create an account, they must agree to our Terms of Service and Privacy Policy. 
              The Google Sign-In button is disabled until this checkbox is checked:
            </p>
            
            <Card className="border-2 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50 mb-4">
                  <Checkbox
                    id="demo-terms"
                    disabled
                    checked={true}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="demo-terms"
                      className="text-sm leading-tight"
                    >
                      I agree to the{" "}
                      <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                    </Label>
                  </div>
                </div>
                <Button disabled className="w-full">
                  Sign in with Google
                </Button>
              </CardContent>
            </Card>
            
            <p className="text-sm text-muted-foreground mt-4 italic">
              Live page URL: <a href="https://baxpro.xyz/login" className="text-primary hover:underline">baxpro.xyz/login</a>
            </p>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: SMS Consent (Call to Action)</h2>
            <p className="text-muted-foreground mb-4">
              After agreeing to Terms and creating an account, users who want SMS notifications must provide 
              explicit consent. The following is the <strong>exact consent disclosure</strong> shown to users. 
              This form is displayed on both the Phone Setup page and Notification Settings page:
            </p>
            
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Text Message Alerts
                </CardTitle>
                <CardDescription>
                  Get instant SMS notifications on your phone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="demo-phone">Phone Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
                      +1
                    </div>
                    <Input
                      id="demo-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      disabled
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    US phone numbers only
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="demo-sms-consent"
                    disabled
                    checked={true}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="demo-sms-consent"
                      className="text-sm font-medium leading-none"
                    >
                      I agree to receive text message alerts from BaxPro
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you consent to receive SMS notifications from BaxPro about 
                      product availability matching your alerts. Message frequency varies based on your 
                      alert settings. Message and data rates may apply. Reply STOP to opt out or HELP 
                      for assistance. See our{" "}
                      <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                    </p>
                  </div>
                </div>
                
                <Button disabled className="w-full">Save Settings</Button>
              </CardContent>
            </Card>
            
            <p className="text-sm text-muted-foreground mt-4 italic">
              Note: This is a non-functional replica of the actual consent form for documentation purposes. 
              The live form is accessible to authenticated users at baxpro.xyz/notification-settings.
            </p>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Required Disclosure Elements</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Our SMS consent disclosure includes all required elements:</p>
              <div className="grid gap-3 ml-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Brand Identification:</strong> "BaxPro" is clearly identified in the consent checkbox label and disclosure text.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Message Content Description:</strong> "SMS notifications about product availability matching your alerts"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Message Frequency:</strong> "Message frequency varies based on your alert settings"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Rate Disclosure:</strong> "Message and data rates may apply"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Opt-Out Instructions:</strong> "Reply STOP to opt out"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Help Instructions:</strong> "Reply HELP for assistance"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <strong>Terms & Privacy Links:</strong> Links to Terms of Service and Privacy Policy are provided in the disclosure.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Screenshot Evidence</h2>
            <p className="text-muted-foreground mb-4">
              Screenshot of the Notification Settings page showing the SMS consent form as it appears to users:
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <img 
                src={notificationSettingsImage} 
                alt="BaxPro Notification Settings page showing SMS opt-in consent checkbox" 
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Live page URL: <a href="https://baxpro.xyz/notification-settings" className="text-primary hover:underline">baxpro.xyz/notification-settings</a> (requires authentication)
            </p>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Opt-Out Methods</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>Users can opt out of SMS notifications at any time through multiple methods:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Reply STOP:</strong> Text "STOP" to any message from BaxPro</li>
                <li><strong>Reply HELP:</strong> Text "HELP" for assistance and opt-out instructions</li>
                <li><strong>Web Settings:</strong> Uncheck the SMS consent checkbox at baxpro.xyz/notification-settings</li>
                <li><strong>Remove Phone:</strong> Delete their phone number from their account settings</li>
                <li><strong>Contact Support:</strong> Email support@baxpro.xyz</li>
              </ul>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Message Types & Content</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>SMS messages are sent <strong>only</strong> for transactional purposes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Product availability alerts matching user-created search criteria</li>
              </ul>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Example Message:</p>
                <pre className="font-mono text-sm whitespace-pre-wrap">BaxPro.xyz Alert: Russell's{"\n"}Price: $50{"\n"}Link: [link]{"\n"}{"\n"}Reply STOP to cancel or visit baxpro.xyz/notification-settings to unsubscribe</pre>
              </div>
              <p className="mt-4">
                <strong>No marketing, promotional, or advertising messages are ever sent via SMS.</strong>
              </p>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="text-muted-foreground">
              <p>For questions about SMS messaging or to request opt-out assistance:</p>
              <div className="mt-4 space-y-1">
                <p><strong>Email:</strong> <a href="mailto:support@baxpro.xyz" className="text-primary hover:underline">support@baxpro.xyz</a></p>
                <p><strong>Website:</strong> <a href="https://baxpro.xyz" className="text-primary hover:underline">baxpro.xyz</a></p>
                <p><strong>Terms of Service:</strong> <a href="https://baxpro.xyz/terms" className="text-primary hover:underline">baxpro.xyz/terms</a></p>
                <p><strong>Privacy Policy:</strong> <a href="https://baxpro.xyz/privacy" className="text-primary hover:underline">baxpro.xyz/privacy</a></p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Accessible URLs for Verification</h2>
            <div className="text-muted-foreground">
              <p className="mb-4">The following public URLs are available for campaign verification:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>This Page (CTA Documentation):</strong>{" "}
                  <a href="https://baxpro.xyz/opt-in-proof" className="text-primary hover:underline">baxpro.xyz/opt-in-proof</a>
                </li>
                <li>
                  <strong>Terms of Service:</strong>{" "}
                  <a href="https://baxpro.xyz/terms" className="text-primary hover:underline">baxpro.xyz/terms</a>
                </li>
                <li>
                  <strong>Privacy Policy:</strong>{" "}
                  <a href="https://baxpro.xyz/privacy" className="text-primary hover:underline">baxpro.xyz/privacy</a>
                </li>
                <li>
                  <strong>Main Website:</strong>{" "}
                  <a href="https://baxpro.xyz" className="text-primary hover:underline">baxpro.xyz</a>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
