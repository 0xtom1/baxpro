import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, User, DollarSign, Calendar, Clock, ExternalLink } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import type { Asset } from "@shared/schema";

export default function AssetDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/b/:assetId");
  const assetId = params?.assetId;
  const { user, loading: authLoading } = useRequireAuth();

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ['/api/assets', assetId],
    enabled: !!assetId && !!user,
  });

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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

  if (isLoading) {
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
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (error || !asset) {
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
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The asset you're looking for doesn't exist or may have been removed.
              </p>
              <Button onClick={() => setLocation("/dashboard")} data-testid="button-go-to-dashboard">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
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
          <h1 className="text-3xl font-bold mb-2" data-testid="text-asset-name">{asset.name}</h1>
          {asset.producer && (
            <p className="text-lg text-muted-foreground" data-testid="text-asset-producer">
              by {asset.producer}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-semibold" data-testid="text-asset-price">{formatPrice(asset.price)}</p>
                </div>
              </div>

              {asset.producer && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Producer</p>
                    <p className="font-semibold" data-testid="text-asset-producer-detail">{asset.producer}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bottled Year</p>
                  <p className="font-semibold" data-testid="text-asset-bottled-year">
                    {asset.bottledYear ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-semibold" data-testid="text-asset-age">
                    {asset.age ? `${asset.age} years` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Listed Date</p>
                  <p className="font-semibold" data-testid="text-asset-listed-date">
                    {formatDate(asset.listedDate)}
                  </p>
                </div>
              </div>

              <a 
                href={`https://baxus.co/asset/${asset.assetId.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover-elevate cursor-pointer"
                data-testid="link-baxus-asset"
              >
                <ExternalLink className="w-4 h-4" />
                View on Baxus
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
