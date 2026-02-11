import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Moon, Sun, LogOut, User, Crown, AlertCircle, Search, Gift, Loader2, CheckCircle2 } from "lucide-react";
import GlencairnLogo from "./GlencairnLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MAX_ALERTS = 50;

interface DashboardNavProps {
  onNewAlert?: () => void;
  alertCount?: number;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function DashboardNav({ onNewAlert, alertCount = 0, search, onSearchChange, searchPlaceholder = "Brands, producers..." }: DashboardNavProps) {
  const isAtLimit = alertCount >= MAX_ALERTS;
  const { user, logout, environment } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isDevMode = environment !== 'production';
  const hasPhantom = !!user?.phantomWallet;
  const [airdropState, setAirdropState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleAirdrop = async () => {
    if (airdropState !== 'idle') return;
    setAirdropState('loading');
    try {
      const res = await apiRequest('POST', '/api/devnet-airdrop');
      const data = await res.json();
      setAirdropState('done');
      toast({
        title: "Airdrop sent!",
        description: `${data.bottlesSent} bottle${data.bottlesSent !== 1 ? 's' : ''} + 0.5 SOL sent to your wallet. Check My Vault!`,
      });
    } catch (err: any) {
      setAirdropState('idle');
      toast({
        title: "Airdrop failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // Initialize from localStorage, default to dark mode if no preference saved
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    // Apply theme on mount and when isDark changes
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getInitials = () => {
    const displayText = user?.displayName || user?.name;
    if (!displayText) return "U";
    return displayText
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="px-6 h-16 flex items-center justify-between gap-4">
        <a 
          href="/dashboard" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          data-testid="link-logo-dashboard"
        >
          <GlencairnLogo className="w-6 h-6" />
          <span className="font-serif text-xl font-bold">BaxPro</span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-4 font-medium bg-primary/10 text-primary border-primary/20"
          >
            beta
          </Badge>
        </a>
        
        {onSearchChange && (
          <div className="flex-1 max-w-md mx-auto hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDevMode && hasPhantom && (
            <Button
              size="sm"
              onClick={handleAirdrop}
              disabled={airdropState !== 'idle'}
              variant={airdropState === 'done' ? 'secondary' : 'default'}
              className={airdropState === 'done' ? 'opacity-60' : 'bg-[hsl(165,60%,35%)] border-[hsl(165,60%,35%)] text-white'}
              data-testid="button-devnet-airdrop"
            >
              {airdropState === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : airdropState === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Gift className="w-3.5 h-3.5" />
              )}
              <span className="ml-1">{airdropState === 'done' ? 'Sent!' : airdropState === 'loading' ? 'Sending...' : 'Airdrop'}</span>
            </Button>
          )}
          {onNewAlert && (
            <Button 
              onClick={onNewAlert}
              disabled={isAtLimit}
              title={isAtLimit ? `Maximum of ${MAX_ALERTS} alerts reached` : undefined}
              data-testid="button-new-alert"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Alert
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{user?.displayName || user?.name || "User"}</p>
                    {user?.isVip && (
                      <Badge 
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        data-testid="badge-vip"
                      >
                        <Crown className="w-3 h-3 mr-0.5" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {user?.provider === 'phantom' 
                      ? (user?.phantomWallet 
                          ? `${user.phantomWallet.slice(0, 4)}...${user.phantomWallet.slice(-4)}`
                          : 'Phantom Wallet')
                      : user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/alerts")} data-testid="button-my-alerts">
                <AlertCircle className="w-4 h-4 mr-2" />
                My Alerts
              </DropdownMenuItem>
              {user?.isVip && (
                <DropdownMenuItem onClick={() => setLocation("/vip-tools")} data-testid="button-vip-tools">
                  <Crown className="w-4 h-4 mr-2 text-amber-500" />
                  VIP Tools
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setLocation("/account-settings")} data-testid="button-account-settings">
                <User className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} data-testid="button-toggle-theme">
                {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
