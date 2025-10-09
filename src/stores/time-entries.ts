import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import type { TimeEntry, CreateTimeEntryForm } from "@/lib/types";

interface TimeEntriesState {
  timeEntries: TimeEntry[];
  loading: boolean;
  fetchTimeEntries: (
    tenantId: string,
    filters?: TimeEntryFilters
  ) => Promise<void>;
  fetchUnbilledTimeEntries: (
    tenantId: string,
    clientId?: string
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
  markTimeEntriesAsBilled: (
    timeEntryIds: string[],
    invoiceId: string
  ) => Promise<{ error?: string }>;
  getTimeEntriesTotalAmount: (
    timeEntries: TimeEntry[],
    rates: Record<string, number>
  ) => number;
}

interface TimeEntryFilters {
  clientId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  billableOnly?: boolean;
  /** @deprecated Task system removed */
  taskId?: string;
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
          client:clients(id, name, hourly_rate),
          user:profiles!time_entries_user_id_fkey(id, first_name, last_name, email),
          invoice:invoices(id, invoice_number, status)
        `
        )
        .eq("tenant_id", tenantId);

      // Apply filters
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
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
      notify.error("Failed to fetch time entries");
      set({ loading: false });
    }
  },

  fetchUnbilledTimeEntries: async (tenantId: string, clientId?: string) => {
    set({ loading: true });
    const supabase = createBrowserClient();

    try {
      let query = supabase
        .from("time_entries")
        .select(
          `
          *,
          client:clients(id, name, hourly_rate),
          user:profiles!time_entries_user_id_fkey(id, first_name, last_name, email, default_hourly_rate),
          invoice_line_items!left(id)
        `
        )
        .eq("tenant_id", tenantId)
        .eq("is_billable", true)
        .is("invoice_id", null); // Time entries not yet on an invoice

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query.order("entry_date", {
        ascending: false,
      });

      if (error) throw error;

      set({ timeEntries: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching unbilled time entries:", error);
      notify.error("Failed to fetch time entries");
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
          profile_id: userId,
          ...timeEntryData,
        })
        .select(
          `
          *,
          client:clients(id, name, hourly_rate),
          user:profiles!time_entries_user_id_fkey(id, first_name, last_name, email),
          invoice:invoices(id, invoice_number, status)
        `
        )
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Add to local state
      set((state) => ({
        timeEntries: [data, ...state.timeEntries],
      }));

      notify.success("Time entry created successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create time entry";
      notify.error(message);
      return { error: message };
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
          client:clients(id, name, hourly_rate),
          user:profiles!time_entries_user_id_fkey(id, first_name, last_name, email),
          invoice:invoices(id, invoice_number, status)
        `
        )
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        timeEntries: state.timeEntries.map((entry) =>
          entry.id === id ? data : entry
        ),
      }));

      notify.success("Time entry updated successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update time entry";
      notify.error(message);
      return { error: message };
    }
  },

  deleteTimeEntry: async (id: string) => {
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Remove from local state
      set((state) => ({
        timeEntries: state.timeEntries.filter((entry) => entry.id !== id),
      }));

      notify.success("Time entry deleted successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete time entry";
      notify.error(message);
      return { error: message };
    }
  },

  markTimeEntriesAsBilled: async (
    timeEntryIds: string[],
    invoiceId: string
  ) => {
    void invoiceId;
    set((state) => ({
      timeEntries: state.timeEntries.filter(
        (entry) => !timeEntryIds.includes(entry.id)
      ),
    }));
    return {};
  },

  getTimeEntriesTotalAmount: (
    timeEntries: TimeEntry[],
    rates: Record<string, number>
  ) => {
    return timeEntries.reduce((sum, entry) => {
      const clientId = entry.client?.id;
      const rate =
        (clientId && rates[clientId] !== undefined
          ? rates[clientId]
          : rates.default) || 0;
      return sum + entry.hours * rate;
    }, 0);
  },
}));
