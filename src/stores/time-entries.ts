/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type { TimeEntry, CreateTimeEntryForm } from "@/lib/types";

interface TimeEntriesState {
  timeEntries: TimeEntry[];
  loading: boolean;
  fetchTimeEntries: (
    tenantId: string,
    filters?: TimeEntryFilters
  ) => Promise<void>;
  createTimeEntry: (
    tenantId: string,
    userId: string,
    timeEntryData: CreateTimeEntryForm
  ) => Promise<{ error?: string }>;
  updateTimeEntry: (
    id: string,
    timeEntryData: Partial<CreateTimeEntryForm>
  ) => Promise<{ error?: string }>;
  deleteTimeEntry: (id: string) => Promise<{ error?: string }>;
}

interface TimeEntryFilters {
  ticketId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  billableOnly?: boolean;
}

export const useTimeEntriesStore = create<TimeEntriesState>((set) => ({
  timeEntries: [],
  loading: false,

  fetchTimeEntries: async (tenantId: string, filters?: TimeEntryFilters) => {
    set({ loading: true });
    const supabase = createBrowserClient();

    try {
      let query = supabase
        .from("time_entries")
        .select(
          `
          *,
          ticket:tickets(id, title, client:clients(id, name)),
          user:profiles(id, first_name, last_name, email)
        `
        )
        .eq("tenant_id", tenantId);

      // Apply filters
      if (filters?.ticketId) {
        query = query.eq("ticket_id", filters.ticketId);
      }
      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }
      if (filters?.billableOnly) {
        query = query.eq("is_billable", true);
      }

      const { data, error } = await query.order("entry_date", {
        ascending: false,
      });

      if (error) throw error;

      set({ timeEntries: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching time entries:", error);
      set({ loading: false });
    }
  },

  createTimeEntry: async (
    tenantId: string,
    userId: string,
    timeEntryData: CreateTimeEntryForm
  ) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          ...timeEntryData,
        })
        .select(
          `
          *,
          ticket:tickets(id, title, client:clients(id, name)),
          user:profiles(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) return { error: error.message };

      // Add to local state
      set((state) => ({
        timeEntries: [data, ...state.timeEntries],
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to create time entry" };
    }
  },

  updateTimeEntry: async (
    id: string,
    timeEntryData: Partial<CreateTimeEntryForm>
  ) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .update(timeEntryData)
        .eq("id", id)
        .select(
          `
          *,
          ticket:tickets(id, title, client:clients(id, name)),
          user:profiles(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) return { error: error.message };

      // Update local state
      set((state) => ({
        timeEntries: state.timeEntries.map((entry) =>
          entry.id === id ? data : entry
        ),
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to update time entry" };
    }
  },

  deleteTimeEntry: async (id: string) => {
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);

      if (error) return { error: error.message };

      // Remove from local state
      set((state) => ({
        timeEntries: state.timeEntries.filter((entry) => entry.id !== id),
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to delete time entry" };
    }
  },
}));
