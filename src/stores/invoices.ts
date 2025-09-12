import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import type {
  Invoice,
  CreateInvoiceForm,
  InvoiceStatus,
  InvoiceLineItem,
  TimeEntry,
} from "@/lib/types";
import { useTimeEntriesStore } from "./time-entries";

interface TimeEntryWithRates extends TimeEntry {
  ticket?: { client?: { id: string; hourly_rate: number | null } };
  user?: { id: string; default_hourly_rate: number | null };
}

interface InvoicesState {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  loading: boolean;
  fetchInvoices: (tenantId: string, filters?: InvoiceFilters) => Promise<void>;
  fetchInvoice: (id: string) => Promise<void>;
  createInvoice: (
    tenantId: string,
    invoiceData: CreateInvoiceForm
  ) => Promise<{ error?: string; invoice?: Invoice }>;
  updateInvoiceStatus: (
    id: string,
    status: InvoiceStatus
  ) => Promise<{ error?: string }>;
  deleteInvoice: (id: string) => Promise<{ error?: string }>;
  generateInvoiceNumber: (tenantId: string) => Promise<string>;
  setSelectedInvoice: (invoice: Invoice | null) => void;
}

interface InvoiceFilters {
  status?: InvoiceStatus;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}

const supabase = createBrowserClient();

export const useInvoicesStore = create<InvoicesState>((set, get) => ({
  invoices: [],
  selectedInvoice: null,
  loading: false,

  fetchInvoices: async (tenantId: string, filters?: InvoiceFilters) => {
    set({ loading: true });
    try {
      let query = supabase
        .from("invoices")
        .select<Invoice>(
          `*, client:clients(*), line_items:invoice_line_items(*, time_entry:time_entries(*))`
        )
        .eq("tenant_id", tenantId);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      set({ invoices: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      notify.error("Failed to fetch invoices");
      set({ loading: false });
    }
  },

  fetchInvoice: async (id: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select<Invoice>(
          `*, client:clients(*), line_items:invoice_line_items(*, time_entry:time_entries(*))`
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      set({ selectedInvoice: data, loading: false });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      notify.error("Failed to fetch invoice");
      set({ loading: false });
    }
  },

  createInvoice: async (tenantId: string, invoiceData: CreateInvoiceForm) => {
    try {
      const { data: entries, error: entriesError } = await supabase
        .from("time_entries")
        .select<TimeEntryWithRates>(
          `id, description, hours, ticket:tickets(client:clients(id, hourly_rate)), user:profiles(id, default_hourly_rate)`
        )
        .in("id", invoiceData.time_entry_ids);

      if (entriesError) throw entriesError;

      const lineItems: InvoiceLineItem[] = (entries || []).map((entry) => {
        const rate =
          entry.ticket?.client?.hourly_rate ?? entry.user?.default_hourly_rate ?? 0;
        const amount = rate * entry.hours;
        return {
          id: "", // placeholder, Supabase will generate
          invoice_id: "",
          time_entry_id: entry.id,
          description: entry.description,
          hours: entry.hours,
          rate,
          amount,
          created_at: new Date().toISOString(),
          time_entry: undefined,
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const taxRate = invoiceData.tax_rate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;
      const invoiceNumber = await get().generateInvoiceNumber(tenantId);

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          tenant_id: tenantId,
          client_id: invoiceData.client_id,
          invoice_number: invoiceNumber,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: invoiceData.due_date,
          payment_instructions: invoiceData.payment_instructions,
          notes: invoiceData.notes,
        })
        .select<Invoice>()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = lineItems.map((item) => ({
        invoice_id: invoice.id,
        time_entry_id: item.time_entry_id,
        description: item.description,
        hours: item.hours,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_line_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      useTimeEntriesStore
        .getState()
        .markTimeEntriesAsBilled(invoiceData.time_entry_ids, invoice.id);

      const fullInvoice = { ...invoice, line_items: itemsToInsert } as Invoice;

      set((state) => ({ invoices: [fullInvoice, ...state.invoices] }));

      notify.success("Invoice created successfully");
      return { invoice: fullInvoice };
    } catch (error: unknown) {
      console.error("Error creating invoice:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create invoice";
      notify.error(message);
      return { error: message };
    }
  },

  updateInvoiceStatus: async (id: string, status: InvoiceStatus) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === id ? { ...inv, status } : inv
        ),
        selectedInvoice:
          state.selectedInvoice?.id === id
            ? { ...state.selectedInvoice, status }
            : state.selectedInvoice,
      }));

      notify.success("Invoice status updated");
      return {};
    } catch (error: unknown) {
      console.error("Error updating invoice status:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update invoice status";
      notify.error(message);
      return { error: message };
    }
  },

  deleteInvoice: async (id: string) => {
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id),
        selectedInvoice:
          state.selectedInvoice?.id === id ? null : state.selectedInvoice,
      }));

      notify.success("Invoice deleted successfully");
      return {};
    } catch (error: unknown) {
      console.error("Error deleting invoice:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete invoice";
      notify.error(message);
      return { error: message };
    }
  },

  generateInvoiceNumber: async (tenantId: string) => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const { data, error } = await supabase
      .from("invoices")
      .select<Pick<Invoice, "invoice_number">>("invoice_number")
      .eq("tenant_id", tenantId)
      .like("invoice_number", `${prefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error generating invoice number:", error);
      notify.error("Failed to generate invoice number");
      return `${prefix}0001`;
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      const last = data[0].invoice_number.split("-").pop();
      nextNumber = (parseInt(last || "0", 10) || 0) + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  },

  setSelectedInvoice: (invoice: Invoice | null) => {
    set({ selectedInvoice: invoice });
  },
}));

