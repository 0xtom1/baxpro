import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import GlencairnLogo from "./GlencairnLogo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-background/95 backdrop-blur-sm border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlencairnLogo className="w-6 h-6" white={!scrolled} />
          <span className={`font-serif text-xl font-bold ${scrolled ? 'text-foreground' : 'text-white'}`}>
            BaxPro
          </span>
          <Badge 
            variant="secondary" 
            className={`text-[10px] px-1.5 py-0 h-4 font-medium ${
              scrolled 
                ? 'bg-primary/10 text-primary border-primary/20' 
                : 'bg-white/20 text-white border-white/30'
            }`}
          >
            beta
          </Badge>
        </div>
        
        <Link href="/login">
          <Button 
            variant={scrolled ? "default" : "outline"}
            className={!scrolled ? "bg-white/10 backdrop-blur-sm text-white border-white/30 hover-elevate" : ""}
            data-testid="button-nav-login"
          >
            Login
          </Button>
        </Link>
      </div>
    </nav>
  );
}
