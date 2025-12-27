import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/stock_images/bourbon_whiskey_barr_576f6f69.jpg";

export default function Hero() {
  return (
    <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-white mb-6">
          Never Miss Your Perfect Pour
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
          Get instant alerts when your favorite spirits become available on baxus.co. Track prices, set custom criteria, and never let a rare bottle slip away.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          <Link href="/login">
            <Button 
              size="lg" 
              className="text-lg px-8"
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
        
        <div className="flex gap-6 justify-center text-sm text-white/80">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>Tracking 500+ premium spirits</span>
          </div>
        </div>
      </div>
    </section>
  );
}
