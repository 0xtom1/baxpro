import { useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Grid3X3, 
  BarChart3, 
  Activity as ActivityIcon, 
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ActivityFeedWithDetails } from "@shared/schema";

interface BrandAsset {
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
}

interface BrandStats {
  totalBottles: number;
  listedCount: number;
  floorPrice: number | null;
  avgMarketPrice: number | null;
}

interface TraitValue {
  value: string;
  count: number;
}

interface BrandTrait {
  traitType: string;
  values: TraitValue[];
}

interface BrandData {
  brandName: string;
  assets: BrandAsset[];
  stats: BrandStats;
  traits: BrandTrait[];
  activity: ActivityFeedWithDetails[];
}

export default function Brand() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const brandName = params.get("name") || "";
  
  const { user, loading: authLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState("items");
  const [selectedTraits, setSelectedTraits] = useState<Record<string, string[]>>({});
  const [openTraits, setOpenTraits] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery<BrandData>({
    queryKey: ['/api/brand', brandName, selectedTraits],
    queryFn: async () => {
      const queryParams = new URLSearchParams({ name: brandName });
      for (const [traitType, values] of Object.entries(selectedTraits)) {
        for (const value of values) {
          queryParams.append(`trait_${traitType}`, value);
        }
      }
      const res = await fetch(`/api/brand?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch brand data');
      return res.json();
    },
    enabled: !!user && !!brandName,
  });

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    const dateStr = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') 
      ? date + 'Z' 
      : date;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return "";
    const dateStr = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') 
      ? date + 'Z' 
      : date;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const toggleTrait = (traitType: string, value: string) => {
    setSelectedTraits(prev => {
      const current = prev[traitType] || [];
      if (current.includes(value)) {
        const newValues = current.filter(v => v !== value);
        if (newValues.length === 0) {
          const { [traitType]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [traitType]: newValues };
      } else {
        return { ...prev, [traitType]: [...current, value] };
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedTraits({});
  };

  const selectedCount = useMemo(() => {
    return Object.values(selectedTraits).reduce((acc, arr) => acc + arr.length, 0);
  }, [selectedTraits]);

  const chartData = useMemo(() => {
    if (!data?.assets) return [];
    return data.assets
      .filter(a => a.price !== null && a.marketPrice !== null)
      .map(a => ({
        name: a.name,
        price: a.price,
        marketPrice: a.marketPrice,
      }));
  }, [data?.assets]);

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

  if (!brandName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">No brand specified</div>
      </div>
    );
  }

  const TraitsSidebar = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Traits</h3>
        {selectedCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-7 text-xs"
            data-testid="button-clear-filters"
          >
            Clear all
          </Button>
        )}
      </div>
      {data?.traits.map((trait) => (
        <Collapsible
          key={trait.traitType}
          open={openTraits[trait.traitType] ?? false}
          onOpenChange={(open) => setOpenTraits(prev => ({ ...prev, [trait.traitType]: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 hover-elevate rounded-md text-sm">
            <span className="font-medium">{trait.traitType}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{trait.values.length}</Badge>
              {openTraits[trait.traitType] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2">
            <div className="space-y-1 py-2">
              {trait.values.map((v) => (
                <label
                  key={v.value}
                  className="flex items-center gap-2 py-1 px-2 hover-elevate rounded cursor-pointer text-sm"
                  data-testid={`checkbox-trait-${trait.traitType}-${v.value}`}
                >
                  <Checkbox
                    checked={selectedTraits[trait.traitType]?.includes(v.value) ?? false}
                    onCheckedChange={() => toggleTrait(trait.traitType, v.value)}
                  />
                  <span className="flex-1 truncate">{v.value}</span>
                  <span className="text-muted-foreground text-xs">{v.count}</span>
                </label>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GlencairnLogo className="w-5 h-5" />
            <span className="font-serif text-lg font-bold hidden sm:inline">BaxPro</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3" data-testid="text-brand-name">
            {brandName}
          </h1>
          
          {isLoading ? (
            <div className="flex gap-4 flex-wrap">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-28" />
              ))}
            </div>
          ) : data?.stats && (
            <div className="flex gap-3 sm:gap-6 flex-wrap text-sm">
              <div data-testid="stat-total-bottles">
                <div className="text-muted-foreground">Total</div>
                <div className="font-semibold text-lg">{data.stats.totalBottles}</div>
              </div>
              <div data-testid="stat-listed-count">
                <div className="text-muted-foreground">Listed</div>
                <div className="font-semibold text-lg">{data.stats.listedCount}</div>
              </div>
              <div data-testid="stat-floor-price">
                <div className="text-muted-foreground">Floor</div>
                <div className="font-semibold text-lg">{formatPrice(data.stats.floorPrice)}</div>
              </div>
              <div data-testid="stat-avg-market">
                <div className="text-muted-foreground">Avg Market</div>
                <div className="font-semibold text-lg">{formatPrice(data.stats.avgMarketPrice)}</div>
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            <TabsList className="h-9">
              <TabsTrigger value="items" className="gap-1.5" data-testid="tab-items">
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger value="loans" className="gap-1.5" data-testid="tab-loans">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Loans</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5" data-testid="tab-charts">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Charts</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5" data-testid="tab-activity">
                <ActivityIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              className="lg:hidden ml-auto"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
              {selectedCount > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedCount}</Badge>
              )}
            </Button>
          </div>

          <div className="flex gap-6">
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <Card>
                <CardContent className="p-4">
                  <TraitsSidebar />
                </CardContent>
              </Card>
            </aside>

            {showFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-background border-l p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Filters</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <TraitsSidebar />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <TabsContent value="items" className="mt-0">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : data?.assets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No listed bottles found for this brand
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data?.assets.map((asset) => (
                      <Link
                        key={asset.assetIdx}
                        href={`/asset/${asset.assetIdx}`}
                        data-testid={`card-asset-${asset.assetIdx}`}
                      >
                        <Card className="overflow-hidden hover-elevate cursor-pointer">
                          <div className="aspect-square bg-muted relative">
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <GlencairnLogo className="w-12 h-12 opacity-20" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium line-clamp-2 mb-1">{asset.name}</p>
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="font-semibold text-sm">{formatPrice(asset.price)}</span>
                              {asset.marketPrice && (
                                <span className="text-xs text-muted-foreground">
                                  Mkt: {formatPrice(asset.marketPrice)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="loans" className="mt-0">
                <Card>
                  <CardContent className="py-16 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Loans Coming Soon</h3>
                    <p className="text-muted-foreground text-sm">
                      This feature is under development
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charts" className="mt-0">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Price vs Market Price</h3>
                    {chartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No data available for chart
                      </div>
                    ) : (
                      <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis 
                              type="number" 
                              dataKey="price" 
                              name="Listed Price" 
                              tickFormatter={(v) => `$${v}`}
                              className="text-xs"
                            />
                            <YAxis 
                              type="number" 
                              dataKey="marketPrice" 
                              name="Market Price" 
                              tickFormatter={(v) => `$${v}`}
                              className="text-xs"
                            />
                            <Tooltip
                              formatter={(value: number) => formatPrice(value)}
                              labelFormatter={(_, payload) => payload[0]?.payload?.name || ''}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            />
                            <Scatter 
                              data={chartData} 
                              fill="hsl(var(--primary))"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : data?.activity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity found for this brand
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data?.activity.map((item) => (
                      <div
                        key={item.activityIdx}
                        className="flex items-center gap-3 p-2 rounded-lg hover-elevate"
                        data-testid={`activity-row-${item.activityIdx}`}
                      >
                        <div className="text-xs text-muted-foreground w-8">
                          {formatTimeAgo(item.activityDate)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/asset/${item.assetIdx}`}
                            className={`text-sm font-medium hover:underline line-clamp-1 ${
                              item.activityTypeCode?.toUpperCase() === 'NEW_LISTING' && item.isListed === false
                                ? 'line-through opacity-60'
                                : ''
                            }`}
                          >
                            {item.assetName}
                          </Link>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.activityTypeName || item.activityTypeCode}
                        </Badge>
                        {item.price && (
                          <span className="font-semibold text-sm shrink-0">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
