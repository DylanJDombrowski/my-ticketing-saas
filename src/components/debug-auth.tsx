/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { createBrowserClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DebugAuth() {
  const { user, profile } = useAuthStore();
  const [rawProfile, setRawProfile] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchRawProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRawProfile = async () => {
    const supabase = createBrowserClient();

    try {
      // Try to fetch profile without join first
      const { data: profileOnly, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (process.env.NODE_ENV !== "production") {
        console.log("Profile only:", profileOnly);
      }

      if (profileError) {
        setError(`Profile error: ${profileError.message}`);
        return;
      }

      // Try to fetch tenant separately
      if (profileOnly?.tenant_id) {
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profileOnly.tenant_id)
          .single();

        if (process.env.NODE_ENV !== "production") {
          console.log("Tenant:", tenant);
        }

        if (tenantError) {
          setError(`Tenant error: ${tenantError.message}`);
        } else {
          setRawProfile({ ...profileOnly, tenant });
        }
      } else {
        setError("No tenant_id found in profile");
        setRawProfile(profileOnly);
      }
    } catch (err: any) {
      setError(`Fetch error: ${err.message}`);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Debug Auth Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div>
            <strong>User ID:</strong> {user?.id || "No user"}
          </div>
          <div>
            <strong>User Email:</strong> {user?.email || "No email"}
          </div>
          <div>
            <strong>Profile from store:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Raw profile fetch:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
              {JSON.stringify(rawProfile, null, 2)}
            </pre>
          </div>
          {error && (
            <div className="text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
