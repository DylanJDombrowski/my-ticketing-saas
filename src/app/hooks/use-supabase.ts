import { useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase";

export function useSupabase() {
  return useMemo(() => createBrowserClient(), []);
}
