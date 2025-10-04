import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import { handleError } from "@/lib/error-handling";
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

// Create a single supabase instance for the store
const supabase = createBrowserClient();

export const useTicketsStore = create<TicketsState>((set) => ({
  tickets: [],
  loading: false,
  selectedTicket: null,

  fetchTickets: async (tenantId: string, filters?: TicketFilters) => {
    set({ loading: true });

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
      handleError("Failed to fetch tickets", {
        operation: "fetchTickets",
        tenantId,
        details: { filters },
        error,
      }, {
        toastMessage: "Failed to load tickets. Please try again."
      });
      set({ loading: false });
    }
  },

  fetchTicket: async (id: string) => {
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
      handleError("Failed to fetch ticket details", {
        operation: "fetchTicket",
        details: { ticketId: id },
        error,
      }, {
        toastMessage: "Failed to load ticket details. Please try again."
      });
    }
  },

  createTicket: async (tenantId: string, ticketData: CreateTicketForm) => {
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

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Add to local state
      set((state) => ({
        tickets: [data, ...state.tickets],
      }));

      notify.success("Ticket created successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create ticket";
      notify.error(message);
      return { error: message };
    }
  },

  updateTicket: async (id: string, ticketData: Partial<CreateTicketForm>) => {
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

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? data : ticket
        ),
        selectedTicket:
          state.selectedTicket?.id === id ? data : state.selectedTicket,
      }));

      notify.success("Ticket updated successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update ticket";
      notify.error(message);
      return { error: message };
    }
  },

  updateTicketStatus: async (id: string, status: TicketStatus) => {
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

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((ticket) =>
          ticket.id === id ? data : ticket
        ),
        selectedTicket:
          state.selectedTicket?.id === id ? data : state.selectedTicket,
      }));

      notify.success("Ticket status updated");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update ticket status";
      notify.error(message);
      return { error: message };
    }
  },

  deleteTicket: async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Remove from local state
      set((state) => ({
        tickets: state.tickets.filter((ticket) => ticket.id !== id),
        selectedTicket:
          state.selectedTicket?.id === id ? null : state.selectedTicket,
      }));

      notify.success("Ticket deleted successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete ticket";
      notify.error(message);
      return { error: message };
    }
  },

  setSelectedTicket: (ticket: Ticket | null) => {
    set({ selectedTicket: ticket });
  },
}));
