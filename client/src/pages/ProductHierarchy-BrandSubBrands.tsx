import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useRequireVip } from "@/hooks/use-require-vip";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ArrowRightLeft, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Brand {
  brandIdx: number;
  brandName: string;
  producerIdx: number;
  producerName: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

interface SubBrand {
  subBrandIdx: number;
  subBrandName: string | null;
  assetCount: number;
}

interface BrandDetailsData {
  brand: Brand;
  subBrands: SubBrand[];
  allSubBrands: SubBrand[];
  sharedAttributes: Record<string, any>;
}

export default function BrandSubBrands() {
  const { brandIdx } = useParams<{ brandIdx: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireVip();
  const { toast } = useToast();
  
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedSubBrand, setSelectedSubBrand] = useState<SubBrand | null>(null);
  const [targetSubBrandIdx, setTargetSubBrandIdx] = useState<string>("");
  
  const [editingBrandName, setEditingBrandName] = useState(false);
  const [brandNameValue, setBrandNameValue] = useState("");
  const [editingSubBrandIdx, setEditingSubBrandIdx] = useState<number | null>(null);
  const [subBrandNameValue, setSubBrandNameValue] = useState("");

  const { data, isLoading, error } = useQuery<BrandDetailsData>({
    queryKey: ["/api/brand-details", brandIdx],
    queryFn: async () => {
      const res = await fetch(`/api/brand-details/${brandIdx}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch brand details");
      return res.json();
    },
    enabled: !!brandIdx,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ fromSubBrandIdx, toSubBrandIdx }: { fromSubBrandIdx: number; toSubBrandIdx: number }) => {
      const res = await apiRequest("POST", "/api/move-bottles", { fromSubBrandIdx, toSubBrandIdx });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bottles moved",
        description: `Successfully moved ${data.movedCount} bottles`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-details", brandIdx] });
      setMoveDialogOpen(false);
      setSelectedSubBrand(null);
      setTargetSubBrandIdx("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move bottles",
        variant: "destructive",
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ brandIdx, brandName }: { brandIdx: number; brandName: string }) => {
      const res = await apiRequest("PATCH", `/api/brands/${brandIdx}`, { brandName });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Brand renamed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-details", brandIdx] });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-hierarchy"] });
      setEditingBrandName(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename brand",
        variant: "destructive",
      });
    },
  });

  const updateSubBrandMutation = useMutation({
    mutationFn: async ({ subBrandIdx, subBrandName }: { subBrandIdx: number; subBrandName: string | null }) => {
      const res = await apiRequest("PATCH", `/api/sub-brands/${subBrandIdx}`, { subBrandName });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Sub-brand renamed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-details", brandIdx] });
      setEditingSubBrandIdx(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename sub-brand",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ brandIdx, reviewed, reviewedBy }: { brandIdx: number; reviewed: boolean; reviewedBy: string }) => {
      const res = await apiRequest("PATCH", `/api/brands/${brandIdx}/review`, { reviewed, reviewedBy });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-details", brandIdx] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update review status",
        variant: "destructive",
      });
    },
  });

  const handleReviewToggle = (checked: boolean) => {
    if (data?.brand && user) {
      reviewMutation.mutate({
        brandIdx: data.brand.brandIdx,
        reviewed: checked,
        reviewedBy: user.displayName || user.email || "Unknown",
      });
    }
  };

  const handleOpenMoveDialog = (subBrand: SubBrand) => {
    setSelectedSubBrand(subBrand);
    setTargetSubBrandIdx("");
    setMoveDialogOpen(true);
  };

  const handleMove = () => {
    if (selectedSubBrand && targetSubBrandIdx) {
      moveMutation.mutate({
        fromSubBrandIdx: selectedSubBrand.subBrandIdx,
        toSubBrandIdx: parseInt(targetSubBrandIdx, 10),
      });
    }
  };

  const handleStartEditBrand = () => {
    if (data?.brand) {
      setBrandNameValue(data.brand.brandName || "");
      setEditingBrandName(true);
    }
  };

  const handleCancelBrandEdit = () => {
    setBrandNameValue("");
    setEditingBrandName(false);
  };

  const handleSaveBrandName = () => {
    const trimmed = brandNameValue.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Brand name cannot be empty", variant: "destructive" });
      return;
    }
    if (data?.brand) {
      updateBrandMutation.mutate({
        brandIdx: data.brand.brandIdx,
        brandName: trimmed,
      });
    }
  };

  const handleStartEditSubBrand = (subBrand: SubBrand) => {
    setSubBrandNameValue(subBrand.subBrandName || "");
    setEditingSubBrandIdx(subBrand.subBrandIdx);
  };

  const handleCancelSubBrandEdit = () => {
    setSubBrandNameValue("");
    setEditingSubBrandIdx(null);
  };

  const handleSaveSubBrandName = () => {
    if (editingSubBrandIdx !== null) {
      updateSubBrandMutation.mutate({
        subBrandIdx: editingSubBrandIdx,
        subBrandName: subBrandNameValue.trim() || null,
      });
    }
  };

  const totalAssets = data?.subBrands.reduce((sum, sb) => sum + sb.assetCount, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/product-hierarchy-editor")}
            data-testid="button-back-hierarchy"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Brand Details</h1>
        </div>

        {isLoading ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="mb-6">
            <CardContent className="pt-6 text-destructive">
              Failed to load brand data
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Brand Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Producer</label>
                    <p className="font-medium">{data.brand.producerName || "(No Name)"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Brand</label>
                    {editingBrandName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={brandNameValue}
                          onChange={(e) => setBrandNameValue(e.target.value)}
                          className="h-8 w-48"
                          data-testid="input-brand-name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveBrandName();
                            if (e.key === "Escape") handleCancelBrandEdit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleSaveBrandName}
                          disabled={updateBrandMutation.isPending}
                          data-testid="button-save-brand-name"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelBrandEdit}
                          data-testid="button-cancel-brand-name"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{data.brand.brandName || "(No Name)"}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleStartEditBrand}
                          data-testid="button-edit-brand-name"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center gap-3">
                  <Checkbox
                    id="manual-review"
                    checked={!!data.brand.reviewedBy}
                    onCheckedChange={handleReviewToggle}
                    disabled={reviewMutation.isPending}
                    data-testid="checkbox-manual-review"
                  />
                  <label htmlFor="manual-review" className="text-sm cursor-pointer select-none">
                    Manually Reviewed
                  </label>
                  {data.brand.reviewedBy && (
                    <span className="text-sm text-muted-foreground">
                      (reviewed by {data.brand.reviewedBy})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {Object.keys(data.sharedAttributes).length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Shared Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data.sharedAttributes).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-sm text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </label>
                        <p className="font-medium">
                          {value === true ? "Yes" : value === false ? "No" : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sub-Brands ({data.subBrands.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sub-Brand Name</TableHead>
                      <TableHead className="text-right">Asset Count</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.subBrands.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No sub-brands found for this brand
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.subBrands.map((subBrand) => (
                        <TableRow key={subBrand.subBrandIdx} data-testid={`row-sub-brand-${subBrand.subBrandIdx}`}>
                          <TableCell>
                            {editingSubBrandIdx === subBrand.subBrandIdx ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={subBrandNameValue}
                                  onChange={(e) => setSubBrandNameValue(e.target.value)}
                                  className="h-8 w-48"
                                  data-testid={`input-sub-brand-name-${subBrand.subBrandIdx}`}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveSubBrandName();
                                    if (e.key === "Escape") handleCancelSubBrandEdit();
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleSaveSubBrandName}
                                  disabled={updateSubBrandMutation.isPending}
                                  data-testid={`button-save-sub-brand-${subBrand.subBrandIdx}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleCancelSubBrandEdit}
                                  data-testid={`button-cancel-sub-brand-${subBrand.subBrandIdx}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className="cursor-pointer hover:underline text-primary"
                                  onClick={() => setLocation(`/product-hierarchy-editor/sub-brand/${subBrand.subBrandIdx}/assets`)}
                                  data-testid={`link-sub-brand-${subBrand.subBrandIdx}`}
                                >
                                  {subBrand.subBrandName || "(No Sub-Brand)"}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleStartEditSubBrand(subBrand)}
                                  data-testid={`button-edit-sub-brand-${subBrand.subBrandIdx}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{subBrand.assetCount}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenMoveDialog(subBrand)}
                              disabled={data.allSubBrands.length < 2}
                              data-testid={`button-move-${subBrand.subBrandIdx}`}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-1" />
                              Move
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {data.subBrands.length > 0 && (
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{totalAssets}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Bottles to Another Sub-Brand</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Move all {selectedSubBrand?.assetCount || 0} bottles from <strong>{selectedSubBrand?.subBrandName || "(No Sub-Brand)"}</strong> to:
            </p>
            <Select value={targetSubBrandIdx} onValueChange={setTargetSubBrandIdx}>
              <SelectTrigger data-testid="select-target-sub-brand">
                <SelectValue placeholder="Select target sub-brand" />
              </SelectTrigger>
              <SelectContent>
                {data?.allSubBrands
                  .filter((sb) => sb.subBrandIdx !== selectedSubBrand?.subBrandIdx)
                  .map((sb) => (
                    <SelectItem key={sb.subBrandIdx} value={sb.subBrandIdx.toString()}>
                      {sb.subBrandName || "(No Sub-Brand)"} ({sb.assetCount})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)} data-testid="button-cancel-move">
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!targetSubBrandIdx || moveMutation.isPending}
              data-testid="button-confirm-move"
            >
              {moveMutation.isPending ? "Moving..." : "Move Bottles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
