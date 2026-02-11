import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Calendar, Droplet, DollarSign, Activity } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";
import type { ActivityFeedWithDetails } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

interface BottleAsset {
  assetIdx: number;
  assetId: string;
  name: string;
  brandName: string | null;
  isListed: boolean | null;
  listedDate: string | null;
  price: number | null;
  age: number | null;
  bottledYear: number | null;
  marketPrice: number | null;
  producer: string | null;
  imageUrl: string | null;
  metadataJson?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  assetJson?: {
    bottle_release?: {
      brand_name?: string;
      sub_brand_name?: string;
      description?: string;
    };
  };
}

interface BottleDetailResponse {
  asset: BottleAsset;
  activity: ActivityFeedWithDetails[];
}

function formatDate(date: string | Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: string | Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BottleDetail() {
  const { assetId } = useParams<{ assetId: string }>();
  const { user, loading: authLoading } = useRequireAuth();
  usePageTitle("Bottle Detail");

  const { data, isLoading, error } = useQuery<BottleDetailResponse>({
    queryKey: ["/api/my-bottles", assetId],
    queryFn: async () => {
      const res = await fetch(`/api/my-bottles/${encodeURIComponent(assetId)}`);
      if (!res.ok) throw new Error("Failed to fetch bottle details");
      return res.json();
    },
    enabled: !!user && !!assetId,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const asset = data?.asset;
  const activity = data?.activity || [];
  const attributes = asset?.metadataJson?.attributes || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-to-vault">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : error || !asset ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load bottle details</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                {asset.imageUrl ? (
                  <img
                    src={asset.imageUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GlencairnLogo className="w-32 h-32 text-muted-foreground/30" />
                  </div>
                )}
                {asset.isListed && (
                  <Badge className="absolute top-4 right-4 bg-green-500 hover:bg-green-600">
                    Listed
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
                {asset.producer && (
                  <p className="text-muted-foreground mt-1">{asset.producer}</p>
                )}
                {asset.brandName && (
                  <Link href={`/brand?name=${encodeURIComponent(asset.brandName)}`}>
                    <Badge variant="outline" className="mt-2 cursor-pointer hover-elevate">
                      {asset.brandName}
                    </Badge>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {asset.price && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <DollarSign className="w-4 h-4" />
                        Listed Price
                      </div>
                      <p className="text-xl font-bold mt-1">
                        ${asset.price.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {asset.marketPrice && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <DollarSign className="w-4 h-4" />
                        Market Value
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        ${asset.marketPrice.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {asset.age && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Droplet className="w-4 h-4" />
                        Age
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {asset.age} years
                      </p>
                    </CardContent>
                  </Card>
                )}
                {asset.bottledYear && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        Bottled
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {asset.bottledYear}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {attributes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Traits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className="bg-muted/50 rounded-md p-2 text-center"
                        >
                          <p className="text-xs text-muted-foreground uppercase">
                            {attr.trait_type}
                          </p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {attr.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <a
                  href={`https://www.baxus.co/asset/${asset.assetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" data-testid="button-view-on-baxus">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Baxus
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {asset && activity.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activity.map((item) => (
                  <div
                    key={item.activityIdx}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                    data-testid={`activity-row-${item.activityIdx}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          item.activityTypeCode === "PURCHASE"
                            ? "default"
                            : item.activityTypeCode === "LISTING"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.activityTypeName}
                      </Badge>
                      {item.price && (
                        <span className="font-medium">
                          ${item.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(item.activityDate)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
