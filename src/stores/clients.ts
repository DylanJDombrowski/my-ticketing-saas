import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type { Client, CreateClientForm } from "@/lib/types";

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

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  selectedClient: null,

  fetchClients: async (tenantId: string) => {
    set({ loading: true });
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) throw error;

      set({ clients: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching clients:", error);
      set({ loading: false });
    }
  },

  createClient: async (tenantId: string, clientData: CreateClientForm) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          ...clientData,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          return { error: "A client with this email already exists" };
        }
        return { error: error.message };
      }

      // Add to local state
      set((state) => ({
        clients: [...state.clients, data].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

      return {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { error: error.message || "Failed to create client" };
    }
  },

  updateClient: async (id: string, clientData: Partial<CreateClientForm>) => {
    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { error: "A client with this email already exists" };
        }
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

      return {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { error: error.message || "Failed to update client" };
    }
  },

  deleteClient: async (id: string) => {
    const supabase = createBrowserClient();

    try {
      // Check if client has tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("client_id", id)
        .limit(1);

      if (tickets && tickets.length > 0) {
        return { error: "Cannot delete client with existing tickets" };
      }

      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) return { error: error.message };

      // Remove from local state
      set((state) => ({
        clients: state.clients.filter((client) => client.id !== id),
        selectedClient:
          state.selectedClient?.id === id ? null : state.selectedClient,
      }));

      return {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { error: error.message || "Failed to delete client" };
    }
  },

  setSelectedClient: (client: Client | null) => {
    set({ selectedClient: client });
  },
}));
