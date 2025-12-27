import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useRequireVip } from "@/hooks/use-require-vip";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Crown, RefreshCw, Layers, ExternalLink, Github } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function VipTools() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireVip();
  const { toast } = useToast();
  
  const [refreshingMatches, setRefreshingMatches] = useState(false);

  const handleRefreshMatches = async () => {
    setRefreshingMatches(true);
    try {
      const response = await fetch("/api/alerts/refresh-all-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh matches");
      }

      const result = await response.json();

      toast({
        title: "Refresh started",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Failed to refresh",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setRefreshingMatches(false);
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
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold">VIP Tools</h1>
            <Badge 
              variant="outline" 
              className="text-amber-500 border-amber-500/50"
            >
              VIP
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Exclusive tools available only to VIP members
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Product Hierarchy Editor
              </CardTitle>
              <CardDescription>
                Manage producers, brands, and sub-brands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Organize and edit the product hierarchy for the Baxus catalog. 
                Link producers to their brands and brands to their sub-brands for 
                better organization and discovery.
              </p>
              <Link href="/product-hierarchy-editor">
                <Button 
                  variant="outline"
                  className="w-full"
                  data-testid="button-product-hierarchy-link"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Open Product Hierarchy Editor
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Refresh All Alert Matches
              </CardTitle>
              <CardDescription>
                Re-run matching logic across the entire system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Re-run the matching logic on all alerts across all users to find historical matches 
                from the activity feed. This will update the match count for every alert in the system.
              </p>
              <Button 
                onClick={handleRefreshMatches} 
                disabled={refreshingMatches}
                variant="outline"
                className="w-full"
                data-testid="button-refresh-matches"
              >
                {refreshingMatches ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh All Alert Matches
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                Source Code
              </CardTitle>
              <CardDescription>
                View and contribute to BaxPro on GitHub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                BaxPro is open source. Check out the repository to see how it works, 
                report issues, or contribute to the project.
              </p>
              <a 
                href="https://github.com/0xtom1/baxpro" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline"
                  className="w-full"
                  data-testid="button-github-link"
                >
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center pt-4">
            BaxPro is not affiliated with, endorsed by, or connected to baxus.co
          </p>
        </div>
      </main>
    </div>
  );
}
