/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/auth";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useClientsStore } from "@/stores/clients";
import type { TimeEntry, CreateTimeEntryForm } from "@/lib/types";

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntry?: TimeEntry | null;
}

export function TimeEntryModal({
  isOpen,
  onClose,
  timeEntry,
}: TimeEntryModalProps) {
  const [formData, setFormData] = useState<CreateTimeEntryForm>({
    client_id: "",
    description: "",
    hours: 0,
    is_billable: true,
    entry_date: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { profile } = useAuthStore();
  const { createTimeEntry, updateTimeEntry } = useTimeEntriesStore();
  const { clients, fetchClients } = useClientsStore();

  const isEditing = !!timeEntry;

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchClients(profile.tenant_id);
    }
  }, [profile?.tenant_id, fetchClients]);

  useEffect(() => {
    if (timeEntry) {
      setFormData({
        client_id: timeEntry.client_id,
        description: timeEntry.description || "",
        hours: timeEntry.hours,
        is_billable: timeEntry.is_billable,
        entry_date: timeEntry.entry_date,
        invoice_id: timeEntry.invoice_id,
      });
    } else {
      setFormData({
        client_id: "",
        description: "",
        hours: 0,
        is_billable: true,
        entry_date: new Date().toISOString().split("T")[0],
      });
    }
    setError("");
  }, [timeEntry, isOpen]);

  const handleInputChange = (
    field: keyof CreateTimeEntryForm,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!profile?.tenant_id) {
      setError("No tenant found");
      setLoading(false);
      return;
    }

    if (!formData.client_id) {
      setError("Please select a client");
      setLoading(false);
      return;
    }

    if (formData.hours <= 0) {
      setError("Hours must be greater than 0");
      setLoading(false);
      return;
    }

    try {
      let result;

      if (isEditing && timeEntry) {
        result = await updateTimeEntry(timeEntry.id, formData);
      } else {
        result = await createTimeEntry(profile.tenant_id, profile.id, formData);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Quick hour buttons
  const quickHours = [0.5, 1, 2, 4, 8];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Time Entry" : "Log Time Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the time entry details below."
              : "Log time for a client. Add it to an invoice later or create line items manually."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleInputChange("client_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.is_active).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company ? `(${client.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry_date">Date *</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) =>
                  handleInputChange("entry_date", e.target.value)
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hours">Hours *</Label>
              <div className="space-y-2">
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  value={formData.hours || ""}
                  onChange={(e) =>
                    handleInputChange("hours", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  required
                />
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">Quick:</span>
                  {quickHours.map((hours) => (
                    <Button
                      key={hours}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange("hours", hours)}
                    >
                      {hours}h
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="What did you work on?"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_billable"
                checked={formData.is_billable}
                onCheckedChange={(checked) =>
                  handleInputChange("is_billable", checked === true)
                }
              />
              <Label
                htmlFor="is_billable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This time is billable
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Logging..."
                : isEditing
                ? "Update Entry"
                : "Log Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
