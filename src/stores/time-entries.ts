/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import type { TimeEntry, CreateTimeEntryForm } from "@/lib/types";

interface TimeEntriesState {
  timeEntries: TimeEntry[];
  loading: boolean;
  timeEntryStats: TimeEntryStats | null;
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
  fetchTimeEntryStats: (
    tenantId: string,
    filters?: StatsFilters
  ) => Promise<void>;
}

interface TimeEntryFilters {
  ticketId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  billableOnly?: boolean;
}

interface StatsFilters {
  startDate?: string;
  endDate?: string;
  clientId?: string;
}

interface TimeEntryStats {
  totalHours: number;
  billableHours: number;
  hoursByDay: { date: string; hours: number }[];
}

export const useTimeEntriesStore = create<TimeEntriesState>((set) => ({
  timeEntries: [],
  loading: false,
  timeEntryStats: null,

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
          ticket:tickets(id, title, client:clients(id, name, hourly_rate)),
          user:profiles(id, first_name, last_name, email, default_hourly_rate),
          invoice_line_items!left(id)
        `
        )
        .eq("tenant_id", tenantId)
        .eq("is_billable", true)
        .is("invoice_line_items.id", null);

      if (clientId) {
        query = query.eq("ticket.client_id", clientId);
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
    } catch (error: any) {
      notify.error(error.message || "Failed to create time entry");
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
    } catch (error: any) {
      notify.error(error.message || "Failed to update time entry");
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
    } catch (error: any) {
      notify.error(error.message || "Failed to delete time entry");
      return { error: error.message || "Failed to delete time entry" };
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
      const clientId = entry.ticket?.client?.id;
      const rate =
        (clientId && rates[clientId] !== undefined
          ? rates[clientId]
          : rates.default) || 0;
      return sum + entry.hours * rate;
    }, 0);
  },

  fetchTimeEntryStats: async (tenantId: string, filters?: StatsFilters) => {
    const supabase = createBrowserClient();
    try {
      let query = supabase
        .from("time_entries")
        .select("hours,is_billable,entry_date,ticket:tickets(client_id)")
        .eq("tenant_id", tenantId);

      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }
      if (filters?.clientId) {
        query = query.eq("ticket.client_id", filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalHours = (data || []).reduce((sum, te) => sum + te.hours, 0);
      const billableHours = (data || [])
        .filter((te) => te.is_billable)
        .reduce((sum, te) => sum + te.hours, 0);

      const hoursByDayMap: Record<string, number> = {};
      (data || []).forEach((te) => {
        const key = te.entry_date;
        hoursByDayMap[key] = (hoursByDayMap[key] || 0) + te.hours;
      });

      const hoursByDay = Object.keys(hoursByDayMap)
        .sort()
        .map((date) => ({ date, hours: hoursByDayMap[date] }));

      set({ timeEntryStats: { totalHours, billableHours, hoursByDay } });
    } catch (error) {
      console.error("Error fetching time entry stats:", error);
      notify.error("Failed to fetch time entry stats");
    }
  },
}));
