import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronRight, Package, Activity, LayoutGrid, ExternalLink, Filter, Landmark, Wallet } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";
import LoansTab from "@/components/LoansTab";
import MyLoansTab from "@/components/MyLoansTab";
import type { ActivityFeedWithDetails } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

type BrandListItem = {
  brandName: string;
  producer: string | null;
  assetCount: number;
  listedCount: number;
  floorPrice: number | null;
  imageUrl: string | null;
  volume7d: number;
  volume30d: number;
  distinctOwnersCount: number;
};

type BrandsListResponse = {
  brands: BrandListItem[];
  total: number;
};

interface PaginatedActivityResponse {
  data: ActivityFeedWithDetails[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface ActivityType {
  activityTypeIdx: number;
  activityTypeCode: string;
  activityTypeName: string;
}

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
}

interface MyBottlesResponse {
  assets: BottleAsset[];
  hasWallet: boolean;
}

type TabType = "brands" | "activity" | "loans" | "my-vault" | "my-loans";

const ITEMS_PER_PAGE = 30;

export default function Dashboard() {
  const { user, loading: authLoading } = useRequireAuth();
  usePageTitle("Dashboard");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("brands");
  const [activityPage, setActivityPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery<BrandsListResponse>({
    queryKey: ["/api/brands-list", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      const res = await fetch(`/api/brands-list?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch brands");
      return res.json();
    },
  });

  const { data: activityTypes } = useQuery<ActivityType[]>({
    queryKey: ['/api/activity-types'],
    enabled: !!user && activeTab === "activity",
  });

  const { data: activityData, isLoading: activityLoading } = useQuery<PaginatedActivityResponse>({
    queryKey: ['/api/activity', activityPage, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(activityPage) });
      if (typeFilter && typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    enabled: !!user && activeTab === "activity",
  });

  const { data: bottlesData, isLoading: bottlesLoading, error: bottlesError } = useQuery<MyBottlesResponse>({
    queryKey: ["/api/my-bottles"],
    queryFn: async () => {
      const res = await fetch("/api/my-bottles");
      if (!res.ok) throw new Error("Failed to fetch bottles");
      return res.json();
    },
    enabled: !!user && activeTab === "my-vault",
  });

  const brands = data?.brands || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const filteredBrands = brands;

  const activities = activityData?.data ?? [];
  const activityPagination = activityData?.pagination;

  const bottleAssets = bottlesData?.assets || [];
  const hasWallet = bottlesData?.hasWallet ?? false;
  const totalPortfolioValue = bottleAssets.reduce((sum, a) => {
    const val = a.price ?? a.marketPrice ?? null;
    return val ? sum + val : sum;
  }, 0);
  const bottlesWithValue = bottleAssets.filter(a => a.price || a.marketPrice).length;
  const listedCount = bottleAssets.filter(a => a.isListed).length;

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return `$${price.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (!volume || volume === 0) return "-";
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toLocaleString()}`;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    const dateStr = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') 
      ? date + 'Z' 
      : date;
    const d = new Date(dateStr);
    return (
      <div className="whitespace-nowrap">
        <div>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        <div className="text-xs text-muted-foreground">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardNav />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Failed to load brands</p>
        </div>
      </div>
    );
  }

  const hasPhantom = !!user?.phantomWallet;
  const hasAnyWallet = !!(user?.phantomWallet || user?.baxusWallet);

  const tabs: { id: TabType; label: string; icon: any; hidden?: boolean }[] = [
    { id: "brands", label: "BRANDS", icon: LayoutGrid },
    { id: "activity", label: "ACTIVITY", icon: Activity },
    { id: "loans", label: "LOANS", icon: Landmark },
    { id: "my-vault", label: "MY VAULT", icon: Package },
    { id: "my-loans", label: "MY LOANS", icon: Wallet, hidden: !hasPhantom },
  ];

  const visibleTabs = tabs.filter(t => !t.hidden);

  const BrandsCards = () => (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-2 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mb-4" />
          <p>No brands found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {filteredBrands.map((brand) => (
            <div
              key={brand.brandName}
              className="bg-card rounded-lg border border-border overflow-hidden hover-elevate cursor-pointer transition-all flex flex-col"
              onClick={() => setLocation(`/brand?name=${encodeURIComponent(brand.brandName)}`)}
              data-testid={`card-brand-${brand.brandName}`}
            >
              <div className="aspect-square bg-muted/30 relative overflow-hidden flex items-center justify-center">
                {brand.imageUrl ? (
                  <img
                    src={brand.imageUrl}
                    alt={brand.brandName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <GlencairnLogo className="w-12 h-12 opacity-20" />
                  </div>
                )}
              </div>
              
              <div className="p-2 flex flex-col gap-1">
                <h3 
                  className="font-medium text-sm truncate leading-tight"
                  data-testid={`text-brand-name-${brand.brandName}`}
                >
                  {brand.brandName}
                </h3>
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {brand.producer || "Unknown Producer"}
                </p>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs mt-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Floor</span>
                    <span className="font-medium text-green-500 tabular-nums">{formatPrice(brand.floorPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">30D Vol</span>
                    <span className="font-medium tabular-nums">{formatVolume(brand.volume30d)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listed</span>
                    <span className="font-medium tabular-nums">{brand.listedCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supply</span>
                    <span className="font-medium tabular-nums text-muted-foreground">{brand.assetCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ActivityTable = () => (
    <div className="flex-1 overflow-hidden">
      <div className="overflow-y-auto h-full scrollbar-hide">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-3 px-4 font-medium">Bottle</th>
              <th className="text-left py-3 px-2 font-medium hidden md:table-cell w-28">Type</th>
              <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Producer</th>
              <th className="text-right py-3 px-2 font-medium hidden md:table-cell w-24">Price</th>
              <th className="text-right py-3 px-4 font-medium w-28 md:w-32">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activityLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 px-4"><Skeleton className="h-10 w-full md:h-5" /></td>
                  <td className="py-3 px-2 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
                  <td className="py-3 px-2 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-2 hidden md:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                </tr>
              ))
            ) : (
              activities.map((activity) => {
                const isDelisted = activity.activityTypeCode?.toUpperCase() === 'NEW_LISTING' && activity.isListed === false;
                return (
                  <tr 
                    key={activity.activityIdx} 
                    className="hover-elevate"
                    data-testid={`row-activity-${activity.activityIdx}`}
                  >
                    <td className="py-3 px-4">
                      <Link 
                        href={`/asset/${activity.assetIdx}`}
                        className={`text-primary hover:underline font-medium line-clamp-1 ${isDelisted ? 'line-through opacity-60' : ''}`}
                        data-testid={`link-asset-${activity.assetIdx}`}
                      >
                        {activity.assetName}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap md:hidden">
                        <Badge variant="secondary" className="text-[10px]">
                          {activity.activityTypeName || activity.activityTypeCode || 'Unknown'}
                        </Badge>
                        {activity.price != null && (
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {formatPrice(activity.price)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {activity.activityTypeName || activity.activityTypeCode || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden md:table-cell truncate max-w-[120px]">
                      {activity.producer || '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-medium tabular-nums hidden md:table-cell">
                      {formatPrice(activity.price)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.activityDate)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {activities.length === 0 && !activityLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mb-4" />
            <p>No activity found</p>
          </div>
        )}
      </div>
    </div>
  );

  const MyVaultContent = () => (
    <div className="flex-1 overflow-y-auto">
      {hasAnyWallet && bottleAssets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Portfolio Value</p>
            <p className="text-2xl font-bold tabular-nums text-foreground" data-testid="text-portfolio-value">
              {totalPortfolioValue > 0 ? `$${totalPortfolioValue.toLocaleString()}` : '-'}
            </p>
            {bottlesWithValue > 0 && bottlesWithValue < bottleAssets.length && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on {bottlesWithValue} of {bottleAssets.length} bottles
              </p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bottles</p>
            <p className="text-2xl font-bold tabular-nums text-foreground" data-testid="text-bottle-count">
              {bottleAssets.length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Listed</p>
            <p className="text-2xl font-bold tabular-nums text-foreground" data-testid="text-listed-count">
              {listedCount}
            </p>
          </Card>
        </div>
      )}

      {bottlesLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bottlesError ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load your bottles</p>
            <p className="text-sm mt-2">Please try again later</p>
          </div>
        </Card>
      ) : !hasAnyWallet ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium text-foreground mb-2">No wallet connected</p>
            <p className="text-sm">
              Connect your Phantom wallet or add a wallet address in{" "}
              <Link href="/account-settings" className="text-primary hover:underline">
                Account Settings
              </Link>{" "}
              to view your Baxus bottles.
            </p>
          </div>
        </Card>
      ) : bottleAssets.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium text-foreground mb-2">No Baxus bottles found</p>
            <p className="text-sm">
              Your wallet doesn't contain any Baxus bottles. Visit the{" "}
              <a
                href="https://www.baxus.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Baxus marketplace
                <ExternalLink className="w-3 h-3" />
              </a>{" "}
              to find bottles to collect.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {bottleAssets.map((asset) => (
            <Link key={asset.assetId} href={`/my-vault/${encodeURIComponent(asset.assetId)}`}>
              <Card
                className="overflow-hidden hover-elevate cursor-pointer transition-all"
                data-testid={`card-bottle-${asset.assetIdx}`}
              >
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
                      <GlencairnLogo className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {asset.isListed && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full">
                        Listed
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm text-foreground truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  {asset.producer && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {asset.producer}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-1 flex-wrap mt-2">
                    {asset.price ? (
                      <span className="text-sm font-medium text-primary">
                        ${asset.price.toLocaleString()}
                      </span>
                    ) : asset.marketPrice ? (
                      <span className="text-xs text-muted-foreground">
                        Est. ${asset.marketPrice.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                    {asset.age && (
                      <span className="text-xs text-muted-foreground">
                        {asset.age}yr
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const showSearch = activeTab === "brands";

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col h-screen bg-background">
        <DashboardNav 
          search={showSearch ? search : undefined}
          onSearchChange={showSearch ? setSearch : undefined}
        />

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex items-center gap-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium tracking-wider border-b-2 transition-colors ${
                    isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <div className="flex-1" />
            {activeTab === "activity" && (
              <div className="flex items-center gap-2 py-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select 
                  value={typeFilter} 
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setActivityPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-8" data-testid="select-activity-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {activityTypes?.map((type) => (
                      <SelectItem key={type.activityTypeCode} value={type.activityTypeCode}>
                        {type.activityTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(activeTab === "my-vault" || activeTab === "my-loans") && hasPhantom && (
              <Button
                size="sm"
                onClick={() => setLocation('/create-loan')}
                data-testid="button-create-loan"
              >
                <Landmark className="w-4 h-4 mr-2" />
                Create Loan
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          {activeTab === "brands" && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                <p className="text-sm text-muted-foreground" data-testid="text-brand-count">
                  Page {page} of {totalPages} ({total} brands)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <BrandsCards />
            </>
          )}
          {activeTab === "loans" && (
            <div className="flex-1 overflow-y-auto">
              <LoansTab />
            </div>
          )}
          {activeTab === "activity" && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                <p className="text-sm text-muted-foreground">
                  {activityPagination ? `${activityPagination.totalCount} total records` : ''}
                </p>
                {activityPagination && activityPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {activityPagination.page} of {activityPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                      disabled={activityPage <= 1}
                      data-testid="button-activity-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage(p => Math.min(activityPagination.totalPages, p + 1))}
                      disabled={activityPage >= activityPagination.totalPages}
                      data-testid="button-activity-next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <ActivityTable />
            </>
          )}
          {activeTab === "my-vault" && <MyVaultContent />}
          {activeTab === "my-loans" && (
            <div className="flex-1 overflow-y-auto">
              <MyLoansTab />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col" style={{ paddingBottom: 'calc(3.5rem + max(0.5rem, env(safe-area-inset-bottom, 0px)))' }}>
        <DashboardNav />
        
        {/* Search Bar - only for brands */}
        {showSearch && (
          <div className="border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Brands, producers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="mobile-input-search"
              />
            </div>
          </div>
        )}

        {/* Activity Filter (mobile) */}
        {activeTab === "activity" && (
          <div className="border-b border-border px-4 py-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select 
              value={typeFilter} 
              onValueChange={(value) => {
                setTypeFilter(value);
                setActivityPage(1);
              }}
            >
              <SelectTrigger className="flex-1 h-8" data-testid="mobile-select-activity-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {activityTypes?.map((type) => (
                  <SelectItem key={type.activityTypeCode} value={type.activityTypeCode}>
                    {type.activityTypeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Create Loan button (mobile) */}
        {(activeTab === "my-vault" || activeTab === "my-loans") && hasPhantom && (
          <div className="border-b border-border px-4 py-2 flex justify-end">
            <Button
              size="sm"
              onClick={() => setLocation('/create-loan')}
              data-testid="mobile-button-create-loan"
            >
              <Landmark className="w-4 h-4 mr-2" />
              Create Loan
            </Button>
          </div>
        )}

        {/* Pagination info */}
        {(activeTab === "brands" || activeTab === "activity") && (
          <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap border-b border-border">
            {activeTab === "brands" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Page {page}/{totalPages} ({total} brands)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="mobile-button-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="mobile-button-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {activityPagination ? `${activityPagination.totalCount} records` : ''}
                </p>
                {activityPagination && activityPagination.totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                      disabled={activityPage <= 1}
                      data-testid="mobile-button-activity-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivityPage(p => Math.min(activityPagination.totalPages, p + 1))}
                      disabled={activityPage >= activityPagination.totalPages}
                      data-testid="mobile-button-activity-next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {activeTab === "brands" && <BrandsCards />}
          {activeTab === "loans" && <LoansTab />}
          {activeTab === "activity" && <ActivityTable />}
          {activeTab === "my-vault" && <MyVaultContent />}
          {activeTab === "my-loans" && <MyLoansTab />}
        </div>

        {/* Bottom Tab Bar (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
          <div className="flex items-center justify-around h-14">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  data-testid={`mobile-tab-${tab.id}`}
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
