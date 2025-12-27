import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Moon, Sun, LogOut, Bell, User, Activity, Crown } from "lucide-react";
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

const MAX_ALERTS = 50;

interface DashboardNavProps {
  onNewAlert?: () => void;
  alertCount?: number;
}

export default function DashboardNav({ onNewAlert, alertCount = 0 }: DashboardNavProps) {
  const isAtLimit = alertCount >= MAX_ALERTS;
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

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
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={onNewAlert}
            disabled={isAtLimit}
            title={isAtLimit ? `Maximum of ${MAX_ALERTS} alerts reached` : undefined}
            data-testid="button-new-alert"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Alert
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          
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
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
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
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/activity")} data-testid="button-activity-feed">
                <Activity className="w-4 h-4 mr-2" />
                Activity Feed
              </DropdownMenuItem>
              {user?.isVip && (
                <DropdownMenuItem onClick={() => setLocation("/vip-tools")} data-testid="button-vip-tools">
                  <Crown className="w-4 h-4 mr-2 text-amber-500" />
                  VIP Tools
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setLocation("/account-settings")} data-testid="button-account-settings">
                <User className="w-4 h-4 mr-2" />
                Account Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/notification-settings")} data-testid="button-notification-settings">
                <Bell className="w-4 h-4 mr-2" />
                Notification Settings
              </DropdownMenuItem>
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
