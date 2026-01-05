import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type BrandListItem = {
  brandName: string;
  producer: string | null;
  assetCount: number;
  listedCount: number;
  floorPrice: number | null;
  imageUrl: string | null;
};

type SortField = "brandName" | "producer" | "assetCount" | "listedCount" | "floorPrice";
type SortDirection = "asc" | "desc";

export default function Brands() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("listedCount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: brands, isLoading, error } = useQuery<BrandListItem[]>({
    queryKey: ["/api/brands-list"],
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "brandName" || field === "producer" ? "asc" : "desc");
    }
  };

  const filteredAndSortedBrands = useMemo(() => {
    if (!brands) return [];
    
    let filtered = brands;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = brands.filter(
        b => b.brandName.toLowerCase().includes(searchLower) ||
             (b.producer && b.producer.toLowerCase().includes(searchLower))
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (aVal === null) aVal = sortDirection === "asc" ? Infinity : -Infinity;
      if (bVal === null) bVal = sortDirection === "asc" ? Infinity : -Infinity;
      
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [brands, search, sortField, sortDirection]);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
      data-testid={`sort-${field}`}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Brands</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands or producers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
        {!isLoading && brands && (
          <p className="text-sm text-muted-foreground" data-testid="text-brand-count">
            {filteredAndSortedBrands.length} of {brands.length} brands
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="hidden md:grid grid-cols-[auto_1fr_1fr_100px_100px_100px] gap-4 px-4 py-3 border-b bg-muted/50 sticky top-0 z-10">
          <div className="w-12"></div>
          <SortHeader field="brandName" label="Brand" />
          <SortHeader field="producer" label="Producer" />
          <SortHeader field="assetCount" label="Assets" />
          <SortHeader field="listedCount" label="Listed" />
          <SortHeader field="floorPrice" label="Floor" />
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filteredAndSortedBrands.map((brand) => (
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

            {filteredAndSortedBrands.length === 0 && (
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
