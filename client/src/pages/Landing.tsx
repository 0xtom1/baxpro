import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bell, Landmark, ArrowRight, ChevronDown } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import heroImage from "@assets/stock_images/bourbon_whiskey_barr_576f6f69.jpg";
import { usePageTitle } from "@/hooks/use-page-title";

interface ActivityItem {
  assetName: string;
  activityTypeName: string | null;
  activityTypeCode: string | null;
  price: number | null;
  producer: string | null;
  activityDate: string;
}

function ActivityTicker() {
  const { data: activities } = useQuery<ActivityItem[]>({
    queryKey: ["/api/public/activity"],
    queryFn: async () => {
      const res = await fetch("/api/public/activity");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const tickerRef = useRef<HTMLDivElement>(null);

  if (!activities || activities.length === 0) return null;

  const doubled = [...activities, ...activities];

  const getTypeColor = (code: string | null) => {
    switch (code) {
      case 'NEW_LISTING': return 'text-emerald-400';
      case 'PURCHASE': return 'text-amber-400';
      case 'PRICE_CHANGE': return 'text-sky-400';
      case 'DELISTED': return 'text-red-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="relative overflow-hidden py-3 border-t border-white/[0.06]">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10" />
      <div
        ref={tickerRef}
        className="flex gap-8 animate-ticker whitespace-nowrap"
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm shrink-0">
            <span className={`font-medium ${getTypeColor(item.activityTypeCode)}`}>
              {item.activityTypeName || 'Activity'}
            </span>
            <span className="text-white/40">—</span>
            <span className="text-white/80 max-w-[200px] truncate">{item.assetName}</span>
            {item.price && (
              <span className="text-white/50 tabular-nums">${item.price.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow() {
  const features = [
    {
      icon: Bell,
      label: "Track",
      tagline: "Never miss your perfect pour",
      description: "Custom alerts when bottles matching your criteria hit the market",
    },
    {
      icon: BarChart3,
      label: "Trade",
      tagline: "Know your collection's worth",
      description: "Portfolio value, brand analytics, and real-time market data",
    },
    {
      icon: Landmark,
      label: "Borrow",
      tagline: "Put your bottles to work",
      description: "Use your collection as collateral for SOL loans on-chain",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
      {features.map((f) => (
        <div
          key={f.label}
          className="p-6 md:p-8 bg-black/80 backdrop-blur-sm group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-white/[0.06] flex items-center justify-center">
              <f.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {f.label}
            </span>
          </div>
          <p className="text-white font-medium mb-1">{f.tagline}</p>
          <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  usePageTitle();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/[0.06]' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GlencairnLogo className="w-6 h-6" white />
            <span className="font-serif text-xl font-bold text-white">BaxPro</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium bg-white/10 text-white/70 border-white/20"
            >
              beta
            </Badge>
          </div>
          <Link href="/login">
            <Button
              variant="outline"
              className="bg-white/5 backdrop-blur-sm text-white border-white/20"
              data-testid="button-nav-login"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      <div className="fixed top-16 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/[0.06]">
        <ActivityTicker />
      </div>

      <section className="relative min-h-screen flex flex-col">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Track, Trade &amp; Borrow
              <span className="block text-primary mt-1">Your Spirits Collection</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              Real-time market data, custom alerts, and on-chain lending — all in one place for Baxus collectors.
            </p>

            <Link href="/login">
              <Button
                size="lg"
                className="text-base px-8 gap-2"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <p className="text-xs text-white/30 mt-6">
              BaxPro is not affiliated with, endorsed by, or connected to baxus.co
            </p>
          </div>
        </div>

        <button
          onClick={scrollToFeatures}
          className="relative z-10 mx-auto -mt-10 -mb-5 w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center animate-bounce cursor-pointer"
          aria-label="Scroll to features"
          data-testid="button-scroll-features"
        >
          <ChevronDown className="w-5 h-5 text-white/50" />
        </button>
      </section>

      <section id="features" className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <FeatureRow />
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-white/30 text-sm mb-6">
            Built for collectors. Powered by Solana.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-8 gap-2" data-testid="button-cta-signup">
              Start Collecting Smarter
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            BaxPro is not affiliated with, endorsed by, or connected to baxus.co
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
