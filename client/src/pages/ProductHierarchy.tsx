import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequireVip } from "@/hooks/use-require-vip";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Producer {
  producerIdx: number;
  producerName: string;
}

interface Brand {
  brandIdx: number;
  brandName: string;
}

interface SubBrand {
  subBrandIdx: number;
  subBrandName: string | null;
}

interface HierarchyRow {
  producerIdx: number;
  producerName: string;
  brandIdx: number;
  brandName: string;
  subBrandIdx: number;
  subBrandName: string | null;
  assetCount: number;
  reviewedBy: string | null;
}

export default function ProductHierarchy() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireVip();
  const [selectedProducerIdx, setSelectedProducerIdx] = useState<string>("");
  const [selectedBrandIdx, setSelectedBrandIdx] = useState<string>("");
  const [selectedSubBrandIdx, setSelectedSubBrandIdx] = useState<string>("");
  const [minAssetCount, setMinAssetCount] = useState<number>(1);
  const [reviewFilter, setReviewFilter] = useState<string>("all");

  const { data: producers, isLoading: producersLoading } = useQuery<Producer[]>({
    queryKey: ["/api/producers"],
  });

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands", selectedProducerIdx],
    queryFn: async () => {
      const res = await fetch(`/api/brands/${selectedProducerIdx}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brands");
      return res.json();
    },
    enabled: !!selectedProducerIdx,
  });

  const { data: subBrands, isLoading: subBrandsLoading } = useQuery<SubBrand[]>({
    queryKey: ["/api/sub-brands", selectedBrandIdx],
    queryFn: async () => {
      const res = await fetch(`/api/sub-brands/${selectedBrandIdx}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sub-brands");
      return res.json();
    },
    enabled: !!selectedBrandIdx,
  });

  const queryParams = new URLSearchParams();
  if (selectedProducerIdx) queryParams.set("producerIdx", selectedProducerIdx);
  if (selectedBrandIdx) queryParams.set("brandIdx", selectedBrandIdx);
  if (selectedSubBrandIdx) queryParams.set("subBrandIdx", selectedSubBrandIdx);
  const queryString = queryParams.toString();

  const { data: hierarchyRaw, isLoading: hierarchyLoading } = useQuery<HierarchyRow[]>({
    queryKey: ["/api/brand-hierarchy", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/brand-hierarchy${queryString ? `?${queryString}` : ""}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch hierarchy");
      return res.json();
    },
  });

  const hierarchy = hierarchyRaw?.filter((row) => {
    if (row.assetCount < minAssetCount) return false;
    if (reviewFilter === "reviewed" && !row.reviewedBy) return false;
    if (reviewFilter === "not-reviewed" && row.reviewedBy) return false;
    return true;
  });

  const handleProducerChange = (value: string) => {
    setSelectedProducerIdx(value === "all" ? "" : value);
    setSelectedBrandIdx("");
    setSelectedSubBrandIdx("");
  };

  const handleBrandChange = (value: string) => {
    setSelectedBrandIdx(value === "all" ? "" : value);
    setSelectedSubBrandIdx("");
  };

  const handleSubBrandChange = (value: string) => {
    setSelectedSubBrandIdx(value === "all" ? "" : value);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/vip-tools")}
            data-testid="button-back-vip-tools"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Product Hierarchy Editor</h1>
          <Badge 
            variant="secondary"
            className="text-xs px-2 py-0.5 font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
            data-testid="badge-vip-only"
          >
            <Crown className="w-3.5 h-3.5 mr-1" />
            VIP Only
          </Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-3">
              A tool to categorize all bottles on BAXUS into a structured hierarchy of Producers, Brands, and Sub-Brands.
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Current features:</span> Browse the product hierarchy, filter by producer/brand/sub-brand, view assets linked to each sub-brand, rename brands and sub-brands, and move bottles between sub-brands.
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Coming soon:</span> Recategorize specific bottles and display bottle attributes and images.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Note: Initial brands and sub-brands were generated via Gemini AI.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-64">
                <label className="text-sm text-muted-foreground mb-1 block">Producer</label>
                <Select value={selectedProducerIdx || "all"} onValueChange={handleProducerChange}>
                  <SelectTrigger data-testid="select-producer">
                    <SelectValue placeholder="All Producers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Producers</SelectItem>
                    {producersLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      producers?.map((p) => (
                        <SelectItem key={p.producerIdx} value={p.producerIdx.toString()}>
                          {p.producerName || "(No Name)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-64">
                <label className="text-sm text-muted-foreground mb-1 block">Brand</label>
                <Select 
                  value={selectedBrandIdx || "all"} 
                  onValueChange={handleBrandChange}
                  disabled={!selectedProducerIdx}
                >
                  <SelectTrigger data-testid="select-brand">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brandsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      brands?.map((b) => (
                        <SelectItem key={b.brandIdx} value={b.brandIdx.toString()}>
                          {b.brandName || "(No Name)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-64">
                <label className="text-sm text-muted-foreground mb-1 block">Sub-Brand</label>
                <Select 
                  value={selectedSubBrandIdx || "all"} 
                  onValueChange={handleSubBrandChange}
                  disabled={!selectedBrandIdx}
                >
                  <SelectTrigger data-testid="select-sub-brand">
                    <SelectValue placeholder="All Sub-Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Brands</SelectItem>
                    {subBrandsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      subBrands?.map((sb) => (
                        <SelectItem key={sb.subBrandIdx} value={sb.subBrandIdx.toString()}>
                          {sb.subBrandName || "(No Sub-Brand)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <label className="text-sm text-muted-foreground mb-1 block">Min Asset Count</label>
                <Input
                  type="number"
                  min={0}
                  value={minAssetCount}
                  onChange={(e) => setMinAssetCount(parseInt(e.target.value, 10) || 0)}
                  data-testid="input-min-asset-count"
                />
              </div>

              <div className="w-48">
                <label className="text-sm text-muted-foreground mb-1 block">Review Status</label>
                <Select value={reviewFilter} onValueChange={setReviewFilter}>
                  <SelectTrigger data-testid="select-review-filter">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="reviewed">Reviewed Only</SelectItem>
                    <SelectItem value="not-reviewed">Not Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producer</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Sub-Brand</TableHead>
                  <TableHead className="text-right">Asset Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hierarchyLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : hierarchy?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  hierarchy?.map((row) => (
                    <TableRow key={row.subBrandIdx} data-testid={`row-hierarchy-${row.subBrandIdx}`}>
                      <TableCell>{row.producerName || "(No Name)"}</TableCell>
                      <TableCell>
                        <span
                          className="cursor-pointer hover:underline text-primary"
                          onClick={() => setLocation(`/product-hierarchy-editor/brand/${row.brandIdx}`)}
                          data-testid={`link-brand-${row.brandIdx}`}
                        >
                          {row.brandName || "(No Name)"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="cursor-pointer hover:underline text-primary"
                          onClick={() => setLocation(`/product-hierarchy-editor/sub-brand/${row.subBrandIdx}/assets`)}
                          data-testid={`link-sub-brand-${row.subBrandIdx}`}
                        >
                          {row.subBrandName || "(No Sub-Brand)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.assetCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
