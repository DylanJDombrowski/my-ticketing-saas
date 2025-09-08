/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type {
  Ticket,
  CreateTicketForm,
  TicketStatus,
  TicketPriority,
} from "@/lib/types";

interface TicketsState {
  tickets: Ticket[];
  loading: boolean;
  selectedTicket: Ticket | null;
  fetchTickets: (tenantId: string, filters?: TicketFilters) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (
    tenantId: string,
    ticketData: CreateTicketForm
  ) => Promise<{ error?: string }>;
  updateTicket: (
    id: string,
    ticketData: Partial<CreateTicketForm>
  ) => Promise<{ error?: string }>;
  updateTicketStatus: (
    id: string,
    status: TicketStatus
  ) => Promise<{ error?: string }>;
  deleteTicket: (id: string) => Promise<{ error?: string }>;
  setSelectedTicket: (ticket: Ticket | null) => void;
}

interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  clientId?: string;
  assignedTo?: string;
}

export const useTicketsStore = create<TicketsState>((set) => ({
  tickets: [],
  loading: false,
  selectedTicket: null,

  fetchTickets: async (tenantId: string, filters?: TicketFilters) => {
    set({ loading: true });
    const supabase = createBrowserClient();

    try {
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .eq("tenant_id", tenantId);

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      set({ tickets: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      set({ loading: false });
    }
  },

  fetchTicket: async (id: string) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      set({ selectedTicket: data });
    } catch (error) {
      console.error("Error fetching ticket:", error);
    }
  },

  createTicket: async (tenantId: string, ticketData: CreateTicketForm) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          tenant_id: tenantId,
          ...ticketData,
        })
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) return { error: error.message };

      // Add to local state
      set((state) => ({
        tickets: [data, ...state.tickets],
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to create ticket" };
    }
  },

  updateTicket: async (id: string, ticketData: Partial<CreateTicketForm>) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("tickets")
        .update(ticketData)
        .eq("id", id)
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) return { error: error.message };

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? data : ticket
        ),
        selectedTicket:
          state.selectedTicket?.id === id ? data : state.selectedTicket,
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to update ticket" };
    }
  },

  updateTicketStatus: async (id: string, status: TicketStatus) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", id)
        .select(
          `
          *,
          client:clients(id, name, email, company),
          assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
          created_user:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
        `
        )
        .single();

      if (error) return { error: error.message };

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? data : ticket
        ),
        selectedTicket:
          state.selectedTicket?.id === id ? data : state.selectedTicket,
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to update ticket status" };
    }
  },

  deleteTicket: async (id: string) => {
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);

      if (error) return { error: error.message };

      // Remove from local state
      set((state) => ({
        tickets: state.tickets.filter((ticket) => ticket.id !== id),
        selectedTicket:
          state.selectedTicket?.id === id ? null : state.selectedTicket,
      }));

      return {};
    } catch (error: any) {
      return { error: error.message || "Failed to delete ticket" };
    }
  },

  setSelectedTicket: (ticket: Ticket | null) => {
    set({ selectedTicket: ticket });
  },
}));
