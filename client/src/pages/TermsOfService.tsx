import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using BaxPro, you agree to be bound by these Terms of Service. If you do not 
              agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              BaxPro is a product availability alert service that monitors Baxus.co and notifies users when 
              products matching their specified criteria become available. We provide alerts via email and SMS 
              based on user preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground mb-2">To use BaxPro, you must:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Be at least 21 years of age</li>
              <li>Create an account using Google authentication</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Use automated systems to access the service without permission</li>
              <li>Resell or redistribute our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Alerts and Notifications</h2>
            <p className="text-muted-foreground">
              BaxPro monitors third-party websites for product availability. We do not guarantee the accuracy, 
              completeness, or timeliness of alerts. Product availability, pricing, and other details are 
              subject to change by the respective retailers. We are not affiliated with Baxus or any retailer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. SMS Terms</h2>
            <p className="text-muted-foreground">
              By opting into SMS notifications, you consent to receive text messages from BaxPro. We will 
              never send marketing or promotional messages via text - only alerts matching your saved criteria. 
              Message frequency varies. Standard message and data rates may apply. Text STOP to opt-out or manage 
              your preferences in your account settings. Carriers are not liable for delayed or undelivered messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of BaxPro are owned by us and are protected by 
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              BaxPro is provided "as is" without warranties of any kind. We do not guarantee that the service 
              will be uninterrupted, error-free, or that alerts will always be accurate or timely. We are not 
              responsible for any purchases you make based on our alerts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, BaxPro shall not be liable for any indirect, incidental, 
              special, or consequential damages arising from your use of the service, including but not limited 
              to missed purchase opportunities or inaccurate alerts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account at any time for violation of these 
              terms or for any other reason at our discretion. You may also delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these Terms of Service at any time. Continued use of the service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with the laws of the United States, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us at support@baxpro.xyz
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
