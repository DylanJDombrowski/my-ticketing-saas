"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const loading = useAuthStore((state) => state.loading);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initialize().then(() => {
      setIsInitializing(false);
    });
  }, [initialize]);

  // Show loading screen during initial auth check
  if (isInitializing || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
