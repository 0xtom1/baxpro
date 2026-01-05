import { useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Grid3X3, 
  BarChart3, 
  Activity as ActivityIcon, 
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  X,
  DollarSign,
  Users
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

type TabType = "items" | "bids" | "loans" | "holders" | "charts" | "activity";

export default function Brand() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const brandName = params.get("name") || "";
  
  const { user, loading: authLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [selectedTraits, setSelectedTraits] = useState<Record<string, string[]>>({});
  const [openTraits, setOpenTraits] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return "";
    const dateStr = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') 
      ? date + 'Z' 
      : date;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 60) return `${diffSecs}s`;
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

  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    if (!searchQuery.trim()) return data.assets;
    const query = searchQuery.toLowerCase();
    return data.assets.filter(a => a.name.toLowerCase().includes(query));
  }, [data?.assets, searchQuery]);

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

  const tabs: { id: TabType; label: string; icon: typeof Grid3X3 }[] = [
    { id: "items", label: "ITEMS", icon: Grid3X3 },
    { id: "bids", label: "BIDS", icon: DollarSign },
    { id: "loans", label: "LOANS", icon: Clock },
    { id: "holders", label: "HOLDERS", icon: Users },
    { id: "charts", label: "CHARTS", icon: BarChart3 },
    { id: "activity", label: "ACTIVITY", icon: ActivityIcon },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/brands")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <GlencairnLogo className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="font-semibold text-lg" data-testid="text-brand-name">{brandName}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <Button variant="outline" size="sm" data-testid="button-connect">
            CONNECT
          </Button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-search-toggle"
          >
            <Search className="w-4 h-4" />
            <span>SEARCH</span>
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-filter-toggle"
          >
            <Filter className="w-4 h-4" />
            <span>FILTER</span>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{selectedCount}</Badge>
            )}
          </button>
        </div>
        
        {showSearch && (
          <div className="mt-2">
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              data-testid="input-search"
            />
          </div>
        )}
      </div>

      <main className="flex-1 overflow-auto pb-20">
        {activeTab === "items" && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <span>{data?.stats.listedCount || 0} LISTED</span>
              <div className="flex items-center gap-8">
                <span className="hidden sm:inline">AGE</span>
                <span className="w-20 text-right">PRICE</span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-10 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No listed bottles found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredAssets.map((asset) => (
                  <Link
                    key={asset.assetIdx}
                    href={`/asset/${asset.assetIdx}`}
                    data-testid={`row-asset-${asset.assetIdx}`}
                  >
                    <div className="flex items-center gap-3 px-4 py-2 hover-elevate">
                      <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                        {asset.imageUrl ? (
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GlencairnLogo className="w-5 h-5 opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {asset.age && (
                          <span className="text-sm text-muted-foreground hidden sm:inline w-12 text-center">
                            {asset.age}yr
                          </span>
                        )}
                        <div className="w-20 text-right">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatPrice(asset.price)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "bids" && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Bids Coming Soon</p>
            </div>
          </div>
        )}

        {activeTab === "loans" && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Loans Coming Soon</p>
            </div>
          </div>
        )}

        {activeTab === "holders" && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Holders Coming Soon</p>
            </div>
          </div>
        )}

        {activeTab === "charts" && (
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-sm">Price vs Market Price</h3>
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
          </div>
        )}

        {activeTab === "activity" && (
          <div className="flex flex-col">
            <div className="px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ActivityIcon className="w-4 h-4" />
                <span>ALL ACTIVITY</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <div className="flex items-center gap-3">
                <span className="w-8"></span>
                <span>ITEM</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-20 text-right">PRICE</span>
                <span className="w-16 hidden sm:block">TYPE</span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-8 h-4" />
                    <Skeleton className="w-10 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : data?.activity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No activity found for this brand
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.activity.map((item) => {
                  const isDelisted = item.activityTypeCode?.toUpperCase() === 'NEW_LISTING' && item.isListed === false;
                  return (
                    <div
                      key={item.activityIdx}
                      className="flex items-center gap-3 px-4 py-2 hover-elevate"
                      data-testid={`activity-row-${item.activityIdx}`}
                    >
                      <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                        {formatTimeAgo(item.activityDate)}
                      </span>
                      <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <GlencairnLogo className="w-5 h-5 opacity-30" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/asset/${item.assetIdx}`}
                          className={`text-sm font-medium truncate block hover:underline ${
                            isDelisted ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {item.assetName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="w-20 text-right">
                          {item.price && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatPrice(item.price)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground w-16 hidden sm:block truncate">
                          {item.activityTypeName || item.activityTypeCode}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {showFilters && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setShowFilters(false)} 
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-background border-l border-border p-4 overflow-y-auto">
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

      {data?.stats.floorPrice && activeTab === "items" && (
        <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-r from-yellow-500 to-green-500 text-black px-4 py-3 flex items-center justify-between font-medium text-sm z-40">
          <div className="flex items-center gap-2">
            <span>BUY FLOOR</span>
            <span className="font-mono">{formatPrice(data.stats.floorPrice)}</span>
          </div>
          <span className="text-black/60">OR</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatPrice(data.stats.floorPrice)}</span>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
