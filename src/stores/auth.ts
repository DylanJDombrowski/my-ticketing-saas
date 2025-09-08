import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    tenantName: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          `
          *,
          tenant:tenants(*)
        `
        )
        .eq("id", data.user.id)
        .single();

      set({ user: data.user, profile });
    }

    return {};
  },

  signUp: async (
    email: string,
    password: string,
    tenantName: string,
    firstName?: string,
    lastName?: string
  ) => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      // Create tenant first
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: tenantName })
        .select()
        .single();

      if (tenantError) {
        return { error: tenantError.message };
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        tenant_id: tenant.id,
        email,
        first_name: firstName,
        last_name: lastName,
      });

      if (profileError) {
        return { error: profileError.message };
      }

      // Fetch complete profile with tenant
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          `
          *,
          tenant:tenants(*)
        `
        )
        .eq("id", data.user.id)
        .single();

      set({ user: data.user, profile });
    }

    return {};
  },

  signOut: async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  initialize: async () => {
    const supabase = createBrowserClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error during init:", profileError);
        set({ user: session.user, profile: null, loading: false });
        return;
      }

      console.log("Initialized profile:", profile);

      if (profile && profile.tenant_id) {
        // Fetch tenant separately
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.tenant_id)
          .single();

        if (tenantError) {
          console.error("Tenant fetch error during init:", tenantError);
        } else {
          console.log("Initialized tenant:", tenant);
          profile.tenant = tenant;
        }
      }

      console.log("Final initialized profile with tenant:", profile);
      set({ user: session.user, profile, loading: false });
    } else {
      set({ user: null, profile: null, loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.tenant_id) {
          // Fetch tenant separately
          const { data: tenant } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", profile.tenant_id)
            .single();

          profile.tenant = tenant;
        }

        set({ user: session.user, profile });
      } else {
        set({ user: null, profile: null });
      }
    });
  },
}));
