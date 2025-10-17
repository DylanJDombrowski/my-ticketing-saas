"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading } = useAuthStore();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Auth check timeout - forcing redirect to login");
        router.push("/login");
      }
    }, 5000); // 5 second timeout

    if (!loading) {
      clearTimeout(timeoutId);

      if (!user) {
        // No user - redirect to login
        setIsRedirecting(true);
        router.push("/login");
        return;
      }

      if (!profile) {
        // User exists but no profile - incomplete registration
        setIsRedirecting(true);
        router.push("/register");
        return;
      }

      if (!profile.tenant_id) {
        // Profile exists but no tenant - incomplete setup
        setIsRedirecting(true);
        router.push("/register");
        return;
      }
    }

    return () => clearTimeout(timeoutId);
  }, [user, profile, loading, router]);

  // Show loading while checking auth or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user || !profile || !profile.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
