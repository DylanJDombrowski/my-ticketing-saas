"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/auth";
import { useInvoicesStore } from "@/stores/invoices";
import { useClientsStore } from "@/stores/clients";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Plus, Trash2, Zap } from "lucide-react";
import { notify } from "@/lib/notifications";

interface QuickInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LineItem {
  description: string;
  amount: number;
}

interface QuickInvoiceForm {
  client_id: string;
}

export function QuickInvoiceModal({
  isOpen,
  onClose,
}: QuickInvoiceModalProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", amount: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitInfo, setLimitInfo] = useState<any>(null);

  const { profile } = useAuthStore();
  const { clients } = useClientsStore();
  const { createQuickInvoice } = useInvoicesStore();

  const {
    handleSubmit,
    reset,
  } = useForm<QuickInvoiceForm>();

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Check if form is valid
  const isFormValid = selectedClientId && lineItems.some(item => item.description.trim() && item.amount > 0);

  const onSubmit = async () => {
    if (!profile?.tenant_id || !selectedClientId) return;

    // Validate line items
    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.amount > 0
    );

    if (validItems.length === 0) {
      notify.error("Please add at least one line item");
      return;
    }

    setLoading(true);

    try {
      // Create invoice with line items
      const invoiceData = {
        client_id: selectedClientId,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 30 days from now
        tax_rate: 0,
        payment_instructions: "",
        notes: "",
      };

      const result = await createQuickInvoice(
        profile.tenant_id,
        invoiceData,
        validItems.map((item) => ({
          description: item.description,
          quantity: 1,
          unit_price: item.amount,
        }))
      );

      // Check if invoice limit was reached
      if (result.error === "invoice_limit_reached") {
        setLimitInfo(result.limitInfo);
        setShowUpgradePrompt(true);
        setLoading(false);
        return;
      }

      if (result.error) {
        // Other errors are handled by the store's notify
        setLoading(false);
        return;
      }

      if (!result.error) {
        notify.success("Invoice created! Ready to send.");
        handleClose();
      }
    } catch (error) {
      console.error("Quick invoice error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedClientId("");
    setLineItems([{ description: "", amount: 0 }]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <DialogTitle>Quick Invoice</DialogTitle>
          </div>
          <DialogDescription>
            Create an invoice in seconds. Just pick a client and add what
            you&apos;re charging.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client-select">
              Client <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedClientId && (
              <p className="text-sm text-muted-foreground">Please select a client to continue</p>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="line-item-0-description">What are you charging for?</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    id={`line-item-${index}-description`}
                    name={`line-item-${index}-description`}
                    placeholder="Description (e.g., Consulting work)"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    className="flex-1"
                    aria-label={`Line item ${index + 1} description`}
                  />
                  <div className="relative w-32">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id={`line-item-${index}-amount`}
                      name={`line-item-${index}-amount`}
                      type="number"
                      placeholder="Amount"
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="pl-8"
                      min="0"
                      step="0.01"
                      aria-label={`Line item ${index + 1} amount`}
                    />
                  </div>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      aria-label={`Remove line item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t">
            <span className="text-lg font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${totalAmount.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && limitInfo && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => {
            setShowUpgradePrompt(false);
            setLoading(false);
          }}
          currentCount={limitInfo.current}
          limit={limitInfo.limit}
        />
      )}
    </Dialog>
  );
}
