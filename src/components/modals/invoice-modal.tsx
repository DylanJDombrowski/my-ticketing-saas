"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/auth";
import { useInvoicesStore } from "@/stores/invoices";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useClientsStore } from "@/stores/clients";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";
import type { CreateInvoiceForm, TimeEntry } from "@/lib/types";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string; // For editing existing invoice
}

interface InvoiceFormData {
  client_id: string;
  selectedTimeEntries: string[];
  due_date: string;
  tax_rate: number;
  payment_instructions: string;
  notes: string;
}

export function InvoiceModal({
  isOpen,
  onClose,
  invoiceId,
}: InvoiceModalProps) {
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<string[]>([]);
  const [availableTimeEntries, setAvailableTimeEntries] = useState<TimeEntry[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitInfo, setLimitInfo] = useState<any>(null);

  const { profile } = useAuthStore();
  const { clients, fetchClients } = useClientsStore();
  const { createInvoice } = useInvoicesStore();
  const { fetchUnbilledTimeEntries } = useTimeEntriesStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    defaultValues: {
      client_id: "",
      selectedTimeEntries: [],
      due_date: "",
      tax_rate: 0,
      payment_instructions: "",
      notes: "",
    },
  });

  const watchedClientId = watch("client_id");
  const watchedTaxRate = watch("tax_rate");

  useEffect(() => {
    if (isOpen && profile?.tenant_id) {
      fetchClients(profile.tenant_id);
      loadUnbilledTimeEntries();
    }
  }, [isOpen, profile?.tenant_id]);

  useEffect(() => {
    if (watchedClientId) {
      // Filter time entries by selected client
      loadUnbilledTimeEntries(watchedClientId);
    }
  }, [watchedClientId]);

  const loadUnbilledTimeEntries = async (clientId?: string) => {
    if (!profile?.tenant_id) return;

    try {
      await fetchUnbilledTimeEntries(profile.tenant_id, clientId);
      // Get the time entries from the store after fetching
      const { timeEntries } = useTimeEntriesStore.getState();

      // Filter by client if specified
      const filtered = clientId
        ? timeEntries.filter((entry) => entry.client_id === clientId)
        : timeEntries;

      setAvailableTimeEntries(filtered);
    } catch (error) {
      console.error("Error loading unbilled time entries:", error);
    }
  };

  const handleTimeEntryToggle = (timeEntryId: string) => {
    setSelectedTimeEntries((prev) => {
      const newSelection = prev.includes(timeEntryId)
        ? prev.filter((id) => id !== timeEntryId)
        : [...prev, timeEntryId];

      setValue("selectedTimeEntries", newSelection);
      return newSelection;
    });
  };

  const getSelectedTimeEntriesData = (): TimeEntry[] => {
    return availableTimeEntries.filter((entry) =>
      selectedTimeEntries.includes(entry.id)
    );
  };

  const calculateInvoiceTotal = () => {
    const selectedEntries = getSelectedTimeEntriesData();
    const subtotal = selectedEntries.reduce((sum, entry) => {
      // Use client's hourly rate, or user's default rate, or fallback to 0
      const rate =
        entry.task?.client?.hourly_rate ??
        entry.user?.default_hourly_rate ??
        0;
      return sum + entry.hours * rate;
    }, 0);

    const taxAmount = subtotal * (watchedTaxRate / 100);
    const total = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      total,
      totalHours: selectedEntries.reduce((sum, entry) => sum + entry.hours, 0),
    };
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (!profile?.tenant_id || selectedTimeEntries.length === 0) {
      return;
    }

    setLoading(true);

    try {
      const invoiceData: CreateInvoiceForm = {
        client_id: data.client_id,
        time_entry_ids: selectedTimeEntries,
        due_date: data.due_date || undefined,
        tax_rate: data.tax_rate,
        payment_instructions: data.payment_instructions || undefined,
        notes: data.notes || undefined,
      };

      const result = await createInvoice(profile.tenant_id, invoiceData);

      // Check if invoice limit was reached
      if (result.error === "invoice_limit_reached") {
        setLimitInfo(result.limitInfo);
        setShowUpgradePrompt(true);
        return;
      }

      if (result.error) {
        // Other errors are handled by the store's notify
        return;
      }

      handleClose();
    } catch (error) {
      console.error("Error creating invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedTimeEntries([]);
    setAvailableTimeEntries([]);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const { subtotal, taxAmount, total, totalHours } = calculateInvoiceTotal();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoiceId ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
          <DialogDescription>
            Select time entries and configure invoice details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={watchedClientId}
                onValueChange={(value) => setValue("client_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.company || "No company"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-red-600">Please select a client</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input type="date" {...register("due_date")} className="w-full" />
            </div>
          </div>

          {/* Time Entries Selection */}
          {watchedClientId && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  Select Time Entries
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose which time entries to include in this invoice
                </p>
              </div>

              {availableTimeEntries.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedTimeEntries.length ===
                              availableTimeEntries.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTimeEntries(
                                  availableTimeEntries.map((e) => e.id)
                                );
                              } else {
                                setSelectedTimeEntries([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableTimeEntries.map((entry) => {
                        const rate =
                          entry.task?.client?.hourly_rate ??
                          entry.user?.default_hourly_rate ??
                          0;
                        const amount = entry.hours * rate;

                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTimeEntries.includes(entry.id)}
                                onCheckedChange={() =>
                                  handleTimeEntryToggle(entry.id)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {formatDate(entry.entry_date)}
                            </TableCell>
                            <TableCell>
                              {entry.description || "No description"}
                            </TableCell>
                            <TableCell>
                              {entry.task?.title || "Unknown task"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {entry.hours}h
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(rate)}</TableCell>
                            <TableCell>{formatCurrency(amount)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No unbilled time entries
                  </h3>
                  <p className="text-muted-foreground">
                    {watchedClientId
                      ? "This client has no unbilled time entries available."
                      : "Select a client to see available time entries."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register("tax_rate", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            {selectedTimeEntries.length > 0 && (
              <div className="space-y-2">
                <Label>Invoice Summary</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Hours:</span>
                      <span>{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({watchedTaxRate}%):</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_instructions">Payment Instructions</Label>
            <Textarea
              {...register("payment_instructions")}
              placeholder="Enter payment instructions for the client..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...register("notes")}
              placeholder="Additional notes for this invoice..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || selectedTimeEntries.length === 0 || !watchedClientId
              }
            >
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
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
