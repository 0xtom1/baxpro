import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useRequireVip } from "@/hooks/use-require-vip";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubBrand {
  subBrandIdx: number;
  subBrandName: string | null;
  brandIdx: number;
  brandName: string;
  producerIdx: number;
  producerName: string;
}

interface Asset {
  name: string;
  age: number | null;
  bottledYear: number | null;
  assetCount: number;
}

interface SubBrandAssetsData {
  subBrand: SubBrand;
  assets: Asset[];
  sharedAttributes: Record<string, any>;
}

export default function SubBrandAssets() {
  const { subBrandIdx } = useParams<{ subBrandIdx: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useRequireVip();

  const { data, isLoading, error } = useQuery<SubBrandAssetsData>({
    queryKey: ["/api/sub-brand-assets", subBrandIdx],
    queryFn: async () => {
      const res = await fetch(`/api/sub-brand-assets/${subBrandIdx}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sub-brand assets");
      return res.json();
    },
    enabled: !!subBrandIdx,
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(data?.subBrand.brandIdx ? `/product-hierarchy-editor/brand/${data.subBrand.brandIdx}` : "/product-hierarchy-editor")}
            data-testid="button-back-hierarchy"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Sub-Brand Assets</h1>
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
              Failed to load sub-brand data
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Sub-Brand Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Producer</label>
                    <p className="font-medium">{data.subBrand.producerName || "(No Name)"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Brand</label>
                    <p className="font-medium">{data.subBrand.brandName || "(No Name)"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Sub-Brand</label>
                    <p className="font-medium">{data.subBrand.subBrandName || "(No Sub-Brand)"}</p>
                  </div>
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
                <CardTitle className="text-lg">Assets ({data.assets.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead className="text-right">Age</TableHead>
                      <TableHead className="text-right">Bottled Year</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No assets found for this sub-brand
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.assets.map((asset, idx) => (
                        <TableRow key={`${asset.name}-${asset.age}-${asset.bottledYear}-${idx}`} data-testid={`row-asset-${idx}`}>
                          <TableCell>{asset.name}</TableCell>
                          <TableCell className="text-right">{asset.age ?? "-"}</TableCell>
                          <TableCell className="text-right">{asset.bottledYear ?? "-"}</TableCell>
                          <TableCell className="text-right">{asset.assetCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
