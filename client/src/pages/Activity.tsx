import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity as ActivityIcon, ExternalLink, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";
import type { ActivityFeedWithDetails } from "@shared/schema";

interface PaginatedResponse {
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

export default function Activity() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireAuth();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: activityTypes } = useQuery<ActivityType[]>({
    queryKey: ['/api/activity-types'],
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ['/api/activity', page, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (typeFilter && typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    enabled: !!user,
  });

  const activities = data?.data ?? [];
  const pagination = data?.pagination;

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
    // Ensure UTC interpretation - append Z if no timezone info
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <ActivityIcon className="w-8 h-8" />
            Activity Feed
          </h1>
          <p className="text-muted-foreground">Recent activity in the Baxus ecosystem</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle>Recent Activity</CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select 
                  value={typeFilter} 
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]" data-testid="select-activity-type">
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
              {pagination && (
                <div className="text-sm text-muted-foreground">
                  {pagination.totalCount} total records
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load activity feed
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity yet
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 md:px-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-2 md:px-4 font-medium text-muted-foreground">Asset</th>
                        <th className="text-left py-3 px-2 md:px-4 font-medium text-muted-foreground hidden lg:table-cell">Producer</th>
                        <th className="text-right py-3 px-2 md:px-4 font-medium text-muted-foreground whitespace-nowrap">Price</th>
                        <th className="text-center py-3 px-2 md:px-4 font-medium text-muted-foreground">Link</th>
                        <th className="text-right py-3 px-2 md:px-4 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((activity) => (
                        <tr 
                          key={activity.activityIdx} 
                          className="border-b last:border-b-0 hover-elevate"
                          data-testid={`row-activity-${activity.activityIdx}`}
                        >
                          <td className="py-3 px-2 md:px-4">
                            <Badge variant="secondary" className="text-xs">
                              {activity.activityTypeName || activity.activityTypeCode || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <Link 
                              href={`/asset/${activity.assetIdx}`}
                              className={`text-primary hover:underline font-medium line-clamp-2 ${
                                activity.activityTypeCode?.toUpperCase() === 'NEW_LISTING' && activity.isListed === false
                                  ? 'line-through opacity-60'
                                  : ''
                              }`}
                              data-testid={`link-asset-${activity.assetIdx}`}
                            >
                              {activity.assetName}
                            </Link>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-sm text-muted-foreground hidden lg:table-cell">
                            {activity.producer || '-'}
                          </td>
                          <td className="py-3 px-2 md:px-4 text-right font-medium whitespace-nowrap">
                            {formatPrice(activity.price)}
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            <a
                              href={`https://baxus.co/asset/${activity.assetId.trim()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center"
                              data-testid={`link-baxus-${activity.activityIdx}`}
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </a>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-right text-sm">
                            {formatDate(activity.activityDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page >= pagination.totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
