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
import DashboardNav from "@/components/DashboardNav";
import LoansTab from "@/components/LoansTab";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ActivityFeedWithDetails } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

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
  usePageTitle("Brand");
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

  const DesktopItemsTable = () => (
    <div className="flex-1 overflow-auto scrollbar-hide">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr className="text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left py-3 px-4 font-medium">Item</th>
            <th className="text-right py-3 px-2 font-medium w-20">Age</th>
            <th className="text-right py-3 px-2 font-medium w-24">Buy Now</th>
            <th className="text-right py-3 px-2 font-medium w-24">Market</th>
            <th className="text-left py-3 px-2 font-medium w-32">Producer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="py-2 px-4"><Skeleton className="h-10 w-full" /></td>
                <td className="py-2 px-2"><Skeleton className="h-4 w-12 ml-auto" /></td>
                <td className="py-2 px-2"><Skeleton className="h-4 w-16 ml-auto" /></td>
                <td className="py-2 px-2"><Skeleton className="h-4 w-16 ml-auto" /></td>
                <td className="py-2 px-2"><Skeleton className="h-4 w-20" /></td>
              </tr>
            ))
          ) : (
            filteredAssets.map((asset) => (
              <tr 
                key={asset.assetIdx} 
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation(`/asset/${asset.assetIdx}`)}
                data-testid={`desktop-row-asset-${asset.assetIdx}`}
              >
                <td className="py-2 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {asset.imageUrl ? (
                        <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GlencairnLogo className="w-5 h-5 opacity-30" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium truncate max-w-[200px]">{asset.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right text-muted-foreground">
                  {asset.age ? `${asset.age}yr` : '-'}
                </td>
                <td className="py-2 px-2 text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatPrice(asset.price)}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-right text-muted-foreground">
                  {asset.marketPrice ? formatPrice(asset.marketPrice) : '-'}
                </td>
                <td className="py-2 px-2 text-muted-foreground truncate max-w-[120px]">
                  {asset.producer || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {filteredAssets.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No listed bottles found</div>
      )}
    </div>
  );

  const DesktopActivityFeed = () => {
    const activities = data?.activity ?? [];
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <ActivityIcon className="w-3 h-3" />
            <span>Activity</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto scrollbar-hide">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 border-b border-border">
            <span>Item</span>
            <span className="w-16 text-right">Price</span>
            <span className="w-12 text-right">Type</span>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">No activity</div>
          ) : (
            <div className="divide-y divide-border">
              {activities.slice(0, 15).map((item) => {
                const isDelisted = item.activityTypeCode?.toUpperCase() === 'NEW_LISTING' && item.isListed === false;
                return (
                  <div key={item.activityIdx} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-xs hover-elevate">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-6 flex-shrink-0">{formatTimeAgo(item.activityDate)}</span>
                      <span className={`truncate ${isDelisted ? 'line-through opacity-60' : ''}`}>{item.assetName}</span>
                    </div>
                    <span className="w-16 text-right font-mono">{item.price ? formatPrice(item.price) : '-'}</span>
                    <span className="w-12 text-right text-muted-foreground truncate">{item.activityTypeName?.split(' ')[0] || '-'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const DesktopChart = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
          <BarChart3 className="w-3 h-3" />
          <span>Price Chart</span>
        </div>
      </div>
      <div className="flex-1 p-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 5, bottom: 15, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" dataKey="price" tickFormatter={(v) => `$${v}`} className="text-[10px]" />
              <YAxis type="number" dataKey="marketPrice" tickFormatter={(v) => `$${v}`} className="text-[10px]" />
              <Tooltip
                formatter={(value: number) => formatPrice(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '10px' }}
              />
              <Scatter data={chartData} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No data</div>
        )}
      </div>
    </div>
  );

  return (
    <>
    {/* Desktop Layout */}
    <div className="hidden lg:flex flex-col h-screen bg-background">
      <DashboardNav />
      {/* Desktop Brand Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} data-testid="desktop-button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <GlencairnLogo className="w-4 h-4" />
              </div>
              <span className="font-semibold" data-testid="desktop-text-brand-name">{brandName}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="text-center">
              <div className="text-muted-foreground uppercase tracking-wider">Floor Price</div>
              <div className="font-mono font-semibold text-green-500">{formatPrice(data?.stats.floorPrice || null)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground uppercase tracking-wider">Listed</div>
              <div className="font-semibold">{data?.stats.listedCount || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground uppercase tracking-wider">Total</div>
              <div className="font-semibold">{data?.stats.totalBottles || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground uppercase tracking-wider">Avg Market</div>
              <div className="font-mono">{formatPrice(data?.stats.avgMarketPrice || null)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="border-b border-border px-4">
        <div className="flex items-center gap-1">
          {tabs.slice(0, 4).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium tracking-wider border-b-2 transition-colors ${
                  isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`desktop-tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 w-48 text-sm"
              data-testid="desktop-input-search"
            />
          </div>
        </div>
      </div>

      {/* Desktop Main Content - Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Filters */}
        <aside className="w-56 border-r border-border overflow-y-auto scrollbar-hide p-3 flex-shrink-0">
          <TraitsSidebar />
        </aside>

        {/* Center - Items Table */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeTab === "items" && <DesktopItemsTable />}
          {activeTab === "bids" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Bids Coming Soon</p></div>
            </div>
          )}
          {activeTab === "loans" && (
            <div className="flex-1 overflow-y-auto">
              <LoansTab filterByBrand={brandName} />
            </div>
          )}
          {activeTab === "holders" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><Users className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Holders Coming Soon</p></div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Activity & Chart */}
        <aside className="w-72 border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="h-1/2 border-b border-border overflow-hidden">
            <DesktopActivityFeed />
          </div>
          <div className="h-1/2 overflow-hidden">
            <DesktopChart />
          </div>
        </aside>
      </div>

      {/* Desktop Buy Floor Banner */}
      {data?.stats.floorPrice && activeTab === "items" && (
        <div className="bg-gradient-to-r from-yellow-500 to-green-500 text-black px-4 py-2 flex items-center justify-between font-medium text-sm">
          <div className="flex items-center gap-2">
            <span>BUY FLOOR</span>
            <span className="font-mono">{formatPrice(data.stats.floorPrice)}</span>
          </div>
          <Button size="sm" className="bg-black/20 hover:bg-black/30 text-black border-0">Buy Now</Button>
        </div>
      )}
    </div>

    {/* Mobile Layout */}
    <div className="lg:hidden min-h-screen bg-background flex flex-col" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
      <DashboardNav />
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/dashboard")}
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

      <main className="flex-1 overflow-auto scrollbar-hide pb-20">
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
          <div className="px-4 py-4">
            <LoansTab filterByBrand={brandName} />
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

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
    </>
  );
}
