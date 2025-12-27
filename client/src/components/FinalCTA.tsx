import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function FinalCTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-8">
          Start Tracking Your Dream Bottles
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button 
              size="lg"
              className="text-lg px-8"
              data-testid="button-cta-signup"
            >
              Sign Up Free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
