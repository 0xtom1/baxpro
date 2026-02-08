import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronRight, Package, Activity, LayoutGrid, ExternalLink, Filter, Landmark } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";
import LoansTab from "@/components/LoansTab";
import type { ActivityFeedWithDetails } from "@shared/schema";

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

type TabType = "brands" | "activity" | "loans";

const ITEMS_PER_PAGE = 30;

export default function Dashboard() {
  const { user, loading: authLoading } = useRequireAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("brands");
  const [activityPage, setActivityPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<BrandsListResponse>({
    queryKey: ["/api/brands-list", page],
    queryFn: async () => {
      const res = await fetch(`/api/brands-list?page=${page}&limit=${ITEMS_PER_PAGE}`);
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

  const brands = data?.brands || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const filteredBrands = search.trim()
    ? brands.filter(
        b => b.brandName.toLowerCase().includes(search.toLowerCase()) ||
             (b.producer && b.producer.toLowerCase().includes(search.toLowerCase()))
      )
    : brands;

  const activities = activityData?.data ?? [];
  const activityPagination = activityData?.pagination;

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

  const tabs = [
    { id: "brands" as TabType, label: "BRANDS", icon: LayoutGrid },
    { id: "loans" as TabType, label: "LOANS", icon: Landmark },
    { id: "activity" as TabType, label: "ACTIVITY", icon: Activity },
  ];

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
              {/* Bottle Image */}
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
              
              {/* Brand Info */}
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
                
                {/* Metrics Grid */}
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
      <div className="overflow-x-auto h-full scrollbar-hide">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-3 px-4 font-medium sticky left-0 bg-muted/80 backdrop-blur-sm z-20 min-w-[200px]">Asset</th>
              <th className="text-left py-3 px-2 font-medium w-28">Type</th>
              <th className="text-left py-3 px-2 font-medium min-w-[100px] hidden lg:table-cell">Producer</th>
              <th className="text-right py-3 px-2 font-medium w-24">Price</th>
              <th className="text-center py-3 px-2 font-medium w-16">Link</th>
              <th className="text-right py-3 px-2 font-medium w-32">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activityLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 sticky left-0 bg-background"><Skeleton className="h-8 w-full" /></td>
                  <td className="py-3 px-2"><Skeleton className="h-5 w-20" /></td>
                  <td className="py-3 px-2 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-2"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="py-3 px-2"><Skeleton className="h-4 w-8 mx-auto" /></td>
                  <td className="py-3 px-2"><Skeleton className="h-8 w-24 ml-auto" /></td>
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
                    <td className="py-3 px-4 sticky left-0 bg-background z-10">
                      <Link 
                        href={`/asset/${activity.assetIdx}`}
                        className={`text-primary hover:underline font-medium line-clamp-2 ${isDelisted ? 'line-through opacity-60' : ''}`}
                        data-testid={`link-asset-${activity.assetIdx}`}
                      >
                        {activity.assetName}
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary" className="text-xs">
                        {activity.activityTypeName || activity.activityTypeCode || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground hidden lg:table-cell truncate max-w-[100px]">
                      {activity.producer || '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-medium tabular-nums">
                      {formatPrice(activity.price)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <a
                        href={`https://baxus.co/asset/${activity.assetId?.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-baxus-${activity.activityIdx}`}
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </a>
                    </td>
                    <td className="py-3 px-2 text-right text-sm">
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

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col h-screen bg-background">
        <DashboardNav 
          search={search}
          onSearchChange={setSearch}
        />

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
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
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          {activeTab === "brands" && (
            <>
              <div className="flex items-center justify-between mb-4">
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
              <div className="flex items-center justify-between mb-4">
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
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col pb-16">
        <DashboardNav />
        
        {/* Search Bar */}
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

        {/* Pagination info */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-border">
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

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {activeTab === "brands" && <BrandsCards />}
          {activeTab === "loans" && <LoansTab />}
          {activeTab === "activity" && <ActivityTable />}
        </div>

        {/* Bottom Tab Bar (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
          <div className="flex items-center justify-around h-16">
            {tabs.map((tab) => {
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
