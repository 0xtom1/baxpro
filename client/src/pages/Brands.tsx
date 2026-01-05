import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronRight, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type BrandListItem = {
  brandName: string;
  producer: string | null;
  assetCount: number;
  listedCount: number;
  floorPrice: number | null;
  imageUrl: string | null;
};

type BrandsListResponse = {
  brands: BrandListItem[];
  total: number;
};

const ITEMS_PER_PAGE = 30;

export default function Brands() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<BrandsListResponse>({
    queryKey: ["/api/brands-list", page],
    queryFn: async () => {
      const res = await fetch(`/api/brands-list?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (!res.ok) throw new Error("Failed to fetch brands");
      return res.json();
    },
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Failed to load brands</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Brands</h1>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search on this page..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
        {!isLoading && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-brand-count">
              Page {page} of {totalPages} ({total} brands total)
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
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="hidden md:grid grid-cols-[auto_1fr_1fr_100px_100px_100px] gap-4 px-4 py-3 border-b bg-muted/50 sticky top-0 z-10">
          <div className="w-12"></div>
          <span className="font-medium text-muted-foreground">Brand</span>
          <span className="font-medium text-muted-foreground">Producer</span>
          <span className="font-medium text-muted-foreground text-right">Assets</span>
          <span className="font-medium text-muted-foreground text-right">Listed</span>
          <span className="font-medium text-muted-foreground text-right">Floor</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filteredBrands.map((brand) => (
              <Link
                key={brand.brandName}
                href={`/brand?name=${encodeURIComponent(brand.brandName)}`}
                data-testid={`link-brand-${brand.brandName}`}
              >
                <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_1fr_100px_100px_100px] gap-4 px-4 py-3 hover-elevate cursor-pointer items-center">
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {brand.imageUrl ? (
                      <img
                        src={brand.imageUrl}
                        alt={brand.brandName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-medium truncate" data-testid={`text-brand-name-${brand.brandName}`}>
                      {brand.brandName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate md:hidden">
                      {brand.producer || "Unknown Producer"}
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground md:hidden mt-1">
                      <span>{brand.assetCount} assets</span>
                      <span>{brand.listedCount} listed</span>
                      {brand.floorPrice && <span>${brand.floorPrice.toLocaleString()}</span>}
                    </div>
                  </div>
                  
                  <p className="hidden md:block text-muted-foreground truncate">
                    {brand.producer || "Unknown"}
                  </p>
                  <p className="hidden md:block text-right tabular-nums">
                    {brand.assetCount.toLocaleString()}
                  </p>
                  <p className="hidden md:block text-right tabular-nums">
                    {brand.listedCount.toLocaleString()}
                  </p>
                  <p className="hidden md:block text-right tabular-nums">
                    {brand.floorPrice ? `$${brand.floorPrice.toLocaleString()}` : "-"}
                  </p>
                </div>
              </Link>
            ))}

            {filteredBrands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-4" />
                <p>No brands found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
