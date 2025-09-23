import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import type { Client, CreateClientForm, Ticket } from "@/lib/types";

interface ClientsState {
  clients: Client[];
  loading: boolean;
  selectedClient: Client | null;
  fetchClients: (tenantId: string) => Promise<void>;
  createClient: (
    tenantId: string,
    clientData: CreateClientForm
  ) => Promise<{ error?: string }>;
  updateClient: (
    id: string,
    clientData: Partial<CreateClientForm>
  ) => Promise<{ error?: string }>;
  deleteClient: (id: string) => Promise<{ error?: string }>;
  setSelectedClient: (client: Client | null) => void;
}

// Create a single supabase instance for the store
const supabase = createBrowserClient();

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  selectedClient: null,

  fetchClients: async (tenantId: string) => {
    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from("clients")
        .select<Client>("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) throw error;

      set({ clients: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching clients:", error);
      notify.error("Failed to fetch clients");
      set({ loading: false });
    }
  },

  createClient: async (tenantId: string, clientData: CreateClientForm) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          ...clientData,
        })
        .select<Client>()
        .single();

      if (error) {
        if (error.code === "23505") {
          notify.error("A client with this email already exists");
          return { error: "A client with this email already exists" };
        }
        notify.error(error.message);
        return { error: error.message };
      }

      // Add to local state
      set((state) => ({
        clients: [...state.clients, data].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

      notify.success("Client created successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create client";
      notify.error(message);
      return { error: message };
    }
  },

  updateClient: async (id: string, clientData: Partial<CreateClientForm>) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .select<Client>()
        .single();

      if (error) {
        if (error.code === "23505") {
          notify.error("A client with this email already exists");
          return { error: "A client with this email already exists" };
        }
        notify.error(error.message);
        return { error: error.message };
      }

      // Update local state
      set((state) => ({
        clients: state.clients
          .map((client) => (client.id === id ? data : client))
          .sort((a, b) => a.name.localeCompare(b.name)),
        selectedClient:
          state.selectedClient?.id === id ? data : state.selectedClient,
      }));

      notify.success("Client updated successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update client";
      notify.error(message);
      return { error: message };
    }
  },

  deleteClient: async (id: string) => {
    try {
      // Check if client has tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select<Pick<Ticket, "id">>("id")
        .eq("client_id", id)
        .limit(1);

      if (tickets && tickets.length > 0) {
        notify.error("Cannot delete client with existing tickets");
        return { error: "Cannot delete client with existing tickets" };
      }

      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      // Remove from local state
      set((state) => ({
        clients: state.clients.filter((client) => client.id !== id),
        selectedClient:
          state.selectedClient?.id === id ? null : state.selectedClient,
      }));

      notify.success("Client deleted successfully");
      return {};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete client";
      notify.error(message);
      return { error: message };
    }
  },

  setSelectedClient: (client: Client | null) => {
    set({ selectedClient: client });
  },
}));
