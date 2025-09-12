"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";
import { useClientsStore } from "@/stores/clients";
import { useInvoicesStore } from "@/stores/invoices";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { usePaymentMethodsStore } from "@/stores/payment-methods";
import type { Invoice, InvoiceFormData } from "@/lib/types";
import { TimeEntrySelector } from "@/components/invoices/time-entry-selector";
import { InvoicePreview } from "@/components/invoices/invoice-preview";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ isOpen, onClose }: InvoiceModalProps) {
  const { profile } = useAuthStore();
  const { clients, fetchClients } = useClientsStore();
  const { createInvoice } = useInvoicesStore();
  const { getTimeEntriesTotalAmount } = useTimeEntriesStore();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethodsStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_id: "",
    selectedTimeEntries: [],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    tax_rate: 0,
    payment_instructions: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchClients(profile.tenant_id);
      fetchPaymentMethods(profile.tenant_id);
    }
  }, [profile?.tenant_id, fetchClients, fetchPaymentMethods]);

  const handleClientChange = (clientId: string) => {
    setFormData((prev) => ({ ...prev, client_id: clientId, selectedTimeEntries: [] }));
  };

  const handleCreate = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const timeEntryIds = formData.selectedTimeEntries.map((e) => e.id);
    const { error } = await createInvoice(profile.tenant_id, {
      client_id: formData.client_id,
      time_entry_ids: timeEntryIds,
      due_date: formData.due_date,
      tax_rate: formData.tax_rate,
      payment_instructions: formData.payment_instructions,
      notes: formData.notes,
    });
    setLoading(false);
    if (!error) {
      onClose();
    }
  };

  const subtotal = getTimeEntriesTotalAmount(formData.selectedTimeEntries, {
    ...(clients.reduce((acc, c) => ({ ...acc, [c.id]: c.hourly_rate ?? 0 }), {})),
    default: profile?.default_hourly_rate ?? 0,
  });
  const taxAmount = subtotal * (formData.tax_rate / 100);
  const total = subtotal + taxAmount;

  const invoicePreview: Invoice = {
    id: "preview",
    tenant_id: profile?.tenant_id || "",
    client_id: formData.client_id,
    invoice_number: "",
    subtotal,
    tax_rate: formData.tax_rate,
    tax_amount: taxAmount,
    total_amount: total,
    status: "draft",
    due_date: formData.due_date,
    payment_instructions: formData.payment_instructions,
    notes: formData.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    client: clients.find((c) => c.id === formData.client_id),
    line_items: formData.selectedTimeEntries.map((te) => {
      const rate = te.ticket?.client?.hourly_rate ?? te.user?.default_hourly_rate ?? 0;
      return {
        id: te.id,
        invoice_id: "preview",
        time_entry_id: te.id,
        description: te.description,
        hours: te.hours,
        rate,
        amount: te.hours * rate,
        created_at: te.created_at,
        time_entry: te,
      };
    }),
  };

  const resetAndClose = () => {
    if (!loading) {
      setStep(1);
      setFormData({
        client_id: "",
        selectedTimeEntries: [],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        tax_rate: 0,
        payment_instructions: "",
        notes: "",
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            {step === 1 && "Select a client"}
            {step === 2 && "Choose billable time entries"}
            {step === 3 && "Enter invoice details"}
            {step === 4 && "Preview invoice"}
          </DialogDescription>
        </DialogHeader>
        {step === 1 && (
          <div className="space-y-4 py-4">
            <Label htmlFor="client">Client</Label>
            <Select value={formData.client_id} onValueChange={handleClientChange}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {step === 2 && (
          <TimeEntrySelector
            clientId={formData.client_id}
            selectedEntries={formData.selectedTimeEntries}
            onSelectionChange={(entries) =>
              setFormData((prev) => ({ ...prev, selectedTimeEntries: entries }))
            }
          />
        )}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tax_rate: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payment_instructions">Payment Instructions</Label>
              <Textarea
                id="payment_instructions"
                value={formData.payment_instructions}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment_instructions: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>
        )}
        {step === 4 && (
          <InvoicePreview
            invoice={invoicePreview}
            paymentMethods={paymentMethods.filter((pm) => pm.is_active)}
          />
        )}
        <DialogFooter className="flex justify-between">
          <div className="space-x-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            )}
            {step < 4 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !formData.client_id) ||
                  (step === 2 && formData.selectedTimeEntries.length === 0)
                }
              >
                Next
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Invoice"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

