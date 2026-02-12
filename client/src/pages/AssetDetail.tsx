import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Package, Wine, Tag, MapPin, Factory, Ruler, Droplets, Calendar, Layers, Hash, Box } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import type { Asset } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

interface MetadataAttribute {
  trait_type: string;
  value: string;
}

interface AssetMetadata {
  name?: string;
  image?: string;
  description?: string;
  symbol?: string;
  attributes?: MetadataAttribute[];
  external_url?: string;
  animation_url?: string;
  properties?: {
    files?: { uri: string; type: string }[];
    category?: string;
  };
}

const TRAIT_ICON_MAP: Record<string, typeof Wine> = {
  "Type": Wine,
  "ABV": Droplets,
  "Country": MapPin,
  "Region": MapPin,
  "Producer": Factory,
  "Bottler": Factory,
  "Producer Type": Factory,
  "Size": Ruler,
  "Year Bottled": Calendar,
  "Year Distilled": Calendar,
  "Cask Type": Layers,
  "Packaging": Box,
  "Serial Number": Hash,
  "Baxus Class Name": Tag,
  "Baxus Class ID": Tag,
  "Name": Tag,
};

const HIDDEN_TRAITS = ["Blurhash", "PackageShot", "Name", "Baxus Class Name", "Baxus Class ID"];

function getTraitIcon(traitType: string) {
  return TRAIT_ICON_MAP[traitType] || Tag;
}

export default function AssetDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/b/:assetId");
  const assetId = params?.assetId;
  const { user, loading: authLoading } = useRequireAuth();
  usePageTitle("Bottle Detail");

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ['/api/assets', assetId],
    enabled: !!assetId && !!user,
  });

  const metadata: AssetMetadata | null = asset?.metadataJson
    ? (typeof asset.metadataJson === 'string' ? JSON.parse(asset.metadataJson) : asset.metadataJson)
    : null;

  const imageUrl = metadata?.image || null;
  const animationUrl = metadata?.animation_url || null;
  const description = metadata?.description || null;
  const externalUrl = metadata?.external_url || `https://baxus.co/asset/${asset?.assetId?.trim()}`;
  const attributes = (metadata?.attributes || []).filter(
    (attr) => !HIDDEN_TRAITS.includes(attr.trait_type) && attr.value
  );

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const topNav = (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
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
          size="sm"
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
      </div>
    </nav>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {topNav}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
            <Skeleton className="aspect-[3/4] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-background">
        {topNav}
        <main className="max-w-md mx-auto px-6 py-16 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bottle Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This bottle doesn't exist or may have been removed.
          </p>
          <Button onClick={() => setLocation("/dashboard")} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const listedPrice = formatPrice(asset.price);
  const marketPrice = formatPrice(asset.marketPrice);

  return (
    <div className="min-h-screen bg-background">
      {topNav}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 lg:gap-8">
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-muted/30 border border-border">
              {animationUrl ? (
                <video
                  src={animationUrl}
                  poster={imageUrl || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full object-contain max-h-[500px]"
                  data-testid="video-bottle"
                />
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={asset.name}
                  className="w-full object-contain max-h-[500px]"
                  data-testid="img-bottle"
                />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center">
                  <Wine className="w-16 h-16 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {(listedPrice || marketPrice) && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  {listedPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Listed Price</span>
                      <span className="text-lg font-bold" data-testid="text-listed-price">{listedPrice}</span>
                    </div>
                  )}
                  {marketPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Market Price</span>
                      <span className="text-lg font-bold" data-testid="text-market-price">{marketPrice}</span>
                    </div>
                  )}
                  {asset.isListed && (
                    <Badge variant="default" className="mt-1" data-testid="badge-listed">Listed</Badge>
                  )}
                </CardContent>
              </Card>
            )}

            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover-elevate"
              data-testid="link-baxus-asset"
            >
              <ExternalLink className="w-4 h-4" />
              View on Baxus
            </a>
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-1" data-testid="text-asset-name">
                {asset.name}
              </h1>
              {asset.producer && (
                <p className="text-base text-muted-foreground" data-testid="text-asset-producer">
                  {asset.producer}
                </p>
              )}
              {asset.brandName && asset.brandName !== asset.producer && (
                <p className="text-sm text-muted-foreground" data-testid="text-asset-brand">
                  {asset.brandName}
                </p>
              )}
            </div>

            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-description">
                {description}
              </p>
            )}

            {attributes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Attributes
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {attributes.map((attr) => {
                    const IconComp = getTraitIcon(attr.trait_type);
                    return (
                      <div
                        key={attr.trait_type}
                        className="p-3 rounded-md bg-muted/40 border border-border/50"
                        data-testid={`attr-${attr.trait_type.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <IconComp className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{attr.trait_type}</span>
                        </div>
                        <span className="text-sm font-medium block truncate">{attr.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
