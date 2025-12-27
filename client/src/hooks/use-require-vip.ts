import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export function useRequireVip() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const returnTo = encodeURIComponent(location);
      setLocation(`/login?returnTo=${returnTo}`);
    } else if (!loading && user && !user.isVip) {
      setLocation("/dashboard");
    }
  }, [user, loading, location, setLocation]);

  return { user, loading, isVip: user?.isVip ?? false };
}
