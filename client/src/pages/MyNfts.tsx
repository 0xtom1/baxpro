import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Wallet, ExternalLink } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";

interface NftAsset {
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

interface MyNftsResponse {
  assets: NftAsset[];
  hasWallet: boolean;
}

export default function MyNfts() {
  const { user, loading: authLoading } = useRequireAuth();

  const { data, isLoading, error } = useQuery<MyNftsResponse>({
    queryKey: ["/api/my-nfts"],
    queryFn: async () => {
      const res = await fetch("/api/my-nfts");
      if (!res.ok) throw new Error("Failed to fetch NFTs");
      return res.json();
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const assets = data?.assets || [];
  const hasWallet = data?.hasWallet ?? false;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My NFTs</h1>
            <p className="text-muted-foreground mt-1">
              Baxus bottles in your connected wallet
            </p>
          </div>
        </div>

        {isLoading ? (
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
        ) : error ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load your NFTs</p>
              <p className="text-sm mt-2">Please try again later</p>
            </div>
          </Card>
        ) : !hasWallet ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground mb-2">No wallet connected</p>
              <p className="text-sm">
                Connect your Phantom wallet or add a wallet address in{" "}
                <Link href="/account-settings" className="text-primary hover:underline">
                  Account Settings
                </Link>{" "}
                to view your Baxus NFTs.
              </p>
            </div>
          </Card>
        ) : assets.length === 0 ? (
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
            {assets.map((asset) => (
              <Link key={asset.assetId} href={`/my-nfts/${encodeURIComponent(asset.assetId)}`}>
                <Card 
                  className="overflow-hidden hover-elevate cursor-pointer transition-all"
                  data-testid={`card-nft-${asset.assetIdx}`}
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
                    <div className="flex items-center justify-between mt-2">
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
      </main>
    </div>
  );
}
