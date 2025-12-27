import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
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
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              This Privacy Policy explains how BaxPro ("we," "our," or "us") collects, uses, and protects 
              your personal information when you use our product availability alert service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-2">When you use BaxPro, we collect:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Email address, name (from Google sign-in)</li>
              <li><strong>Contact Information:</strong> Phone number (optional, for SMS alerts)</li>
              <li><strong>Alert Preferences:</strong> Your saved alert criteria and notification settings</li>
              <li><strong>Usage Data:</strong> How you interact with our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-2">We use your information to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Send you alerts when products matching your criteria become available</li>
              <li>Deliver email and SMS notifications based on your preferences</li>
              <li>Improve our service and user experience</li>
              <li>Communicate important service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. SMS Notifications</h2>
            <p className="text-muted-foreground">
              If you opt-in to SMS notifications, we will send text messages to the phone number you provide 
              when products matching your alerts are found. We will never send marketing or promotional 
              messages via text - only alerts related to your saved criteria. Message frequency varies based 
              on your alerts and available inventory. Standard message and data rates may apply. You can 
              opt-out at any time by replying STOP to any message or updating your notification settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, rent, or share your personal information with third parties for marketing purposes. 
              We may share data with service providers who help us deliver our service (such as SMS delivery 
              providers), and when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your information, including encryption 
              during transmission and secure storage practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Access your personal information</li>
              <li>Update or correct your data</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of notifications at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information for as long as your account is active. If you delete your account, 
              we will remove your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at support@baxpro.xyz
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
