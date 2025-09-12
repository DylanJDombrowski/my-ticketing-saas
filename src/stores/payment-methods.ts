/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import type { PaymentMethod, PaymentMethodForm } from "@/lib/types";

interface PaymentMethodsState {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  fetchPaymentMethods: (tenantId: string) => Promise<void>;
  createPaymentMethod: (
    tenantId: string,
    data: PaymentMethodForm
  ) => Promise<{ error?: string }>;
  updatePaymentMethod: (
    id: string,
    data: Partial<PaymentMethodForm>
  ) => Promise<{ error?: string }>;
  deletePaymentMethod: (id: string) => Promise<{ error?: string }>;
}

const supabase = createBrowserClient();

export const usePaymentMethodsStore = create<PaymentMethodsState>((set) => ({
  paymentMethods: [],
  loading: false,

  fetchPaymentMethods: async (tenantId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      set({ paymentMethods: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching payment methods", error);
      notify.error("Failed to fetch payment methods");
      set({ loading: false });
    }
  },

  createPaymentMethod: async (tenantId: string, data: PaymentMethodForm) => {
    try {
      const { data: inserted, error } = await supabase
        .from("payment_methods")
        .insert({ tenant_id: tenantId, ...data })
        .select()
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      set((state) => ({
        paymentMethods: [...state.paymentMethods, inserted].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));
      notify.success("Payment method added");
      return {};
    } catch (error: any) {
      notify.error(error.message || "Failed to add payment method");
      return { error: error.message || "Failed to add payment method" };
    }
  },

  updatePaymentMethod: async (id: string, data: Partial<PaymentMethodForm>) => {
    try {
      const { data: updated, error } = await supabase
        .from("payment_methods")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      set((state) => ({
        paymentMethods: state.paymentMethods
          .map((pm) => (pm.id === id ? updated : pm))
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
      notify.success("Payment method updated");
      return {};
    } catch (error: any) {
      notify.error(error.message || "Failed to update payment method");
      return { error: error.message || "Failed to update payment method" };
    }
  },

  deletePaymentMethod: async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) {
        notify.error(error.message);
        return { error: error.message };
      }

      set((state) => ({
        paymentMethods: state.paymentMethods.filter((pm) => pm.id !== id),
      }));
      notify.success("Payment method deleted");
      return {};
    } catch (error: any) {
      notify.error(error.message || "Failed to delete payment method");
      return { error: error.message || "Failed to delete payment method" };
    }
  },
}));

