import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export function useRequireAuth() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Encode current path as returnTo parameter
      const returnTo = encodeURIComponent(location);
      setLocation(`/login?returnTo=${returnTo}`);
    }
  }, [user, loading, location, setLocation]);

  return { user, loading };
}
