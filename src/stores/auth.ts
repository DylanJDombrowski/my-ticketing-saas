import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { notify } from "@/lib/notifications";
import { handleError } from "@/lib/error-handling";

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
      notify.error(error.message);
      set({ loading: false });
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

      set({ user: data.user, profile, loading: false });
      notify.success("Signed in successfully");
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

    // Pass metadata to trigger - handle_new_user will create tenant and profile
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: tenantName,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      notify.error(error.message);
      return { error: error.message };
    }

    if (data.user) {
      // Wait for trigger to complete and retry fetching profile
      let profile = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!profile && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: fetchedProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (fetchedProfile?.tenant_id) {
          // Fetch tenant separately to avoid join issues
          const { data: tenant } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", fetchedProfile.tenant_id)
            .single();

          if (tenant) {
            fetchedProfile.tenant = tenant;
          }

          profile = fetchedProfile;
          break;
        }

        // Log error on last attempt
        if (attempts === maxAttempts - 1 && fetchError) {
          console.error("Profile fetch error:", fetchError);
        }

        attempts++;
      }

      if (!profile || !profile.tenant_id) {
        notify.error("Account created but setup incomplete. Please contact support.");
        set({ loading: false });
        return { error: "Profile creation failed" };
      }

      set({ user: data.user, profile, loading: false });
      notify.success("Account created successfully");
    } else {
      set({ loading: false });
    }

    return {};
  },

  signOut: async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
    notify.success("Signed out successfully");
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
        handleError("Profile fetch error during initialization", {
          operation: "fetchProfile",
          userId: session.user.id,
          error: profileError,
        }, {
          toastMessage: "Failed to load profile"
        });
        set({ user: session.user, profile: null, loading: false });
        return;
      }

      if (profile && profile.tenant_id) {
        // Fetch tenant separately
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.tenant_id)
          .single();

        if (tenantError) {
          handleError("Tenant fetch error during initialization", {
            operation: "fetchTenant",
            userId: session.user.id,
            tenantId: profile.tenant_id,
            error: tenantError,
          }, {
            toastMessage: "Failed to load tenant information"
          });
        } else {
          profile.tenant = tenant;
        }
      }
      set({ user: session.user, profile, loading: false });
    } else {
      set({ user: null, profile: null, loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
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
