import { Link } from "wouter";
import LandingNav from "@/components/LandingNav";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import FinalCTA from "@/components/FinalCTA";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      
      <div className="py-4 px-6 text-center">
        <p className="text-xs text-muted-foreground">BaxPro is not affiliated with, endorsed by, or connected to baxus.co</p>
      </div>
      
      <HowItWorks />
      <FinalCTA />
      
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            BaxPro is not affiliated with, endorsed by, or connected to baxus.co
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
