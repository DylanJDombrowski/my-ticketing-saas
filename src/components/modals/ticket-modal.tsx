"use client";

import { useState, useEffect } from "react";
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
import { useTicketsStore } from "@/stores/tickets";
import { useClientsStore } from "@/stores/clients";
import type { Ticket, CreateTicketForm, TicketPriority } from "@/lib/types";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
}

export function TicketModal({ isOpen, onClose, ticket }: TicketModalProps) {
  const [formData, setFormData] = useState<CreateTicketForm>({
    client_id: "",
    title: "",
    description: "",
    priority: "medium",
    estimated_hours: undefined,
    due_date: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { profile } = useAuthStore();
  const { createTicket, updateTicket } = useTicketsStore();
  const { clients, fetchClients } = useClientsStore();

  const isEditing = !!ticket;

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchClients(profile.tenant_id);
    }
  }, [profile?.tenant_id, fetchClients]);

  useEffect(() => {
    if (ticket) {
      setFormData({
        client_id: ticket.client_id,
        title: ticket.title,
        description: ticket.description || "",
        priority: ticket.priority,
        estimated_hours: ticket.estimated_hours,
        due_date: ticket.due_date ? ticket.due_date.split("T")[0] : "",
      });
    } else {
      setFormData({
        client_id: "",
        title: "",
        description: "",
        priority: "medium",
        estimated_hours: undefined,
        due_date: "",
      });
    }
    setError("");
  }, [ticket, isOpen]);

  const handleInputChange = (
    field: keyof CreateTicketForm,
    value: string | number | undefined
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

    try {
      // Prepare the data with proper formatting
      const submitData = {
        ...formData,
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : undefined,
        estimated_hours: formData.estimated_hours || undefined,
      };

      let result;

      if (isEditing && ticket) {
        result = await updateTicket(ticket.id, submitData);
      } else {
        result = await createTicket(profile.tenant_id, submitData);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Ticket" : "Create New Ticket"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the ticket information below."
              : "Fill in the details to create a new support ticket."}
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
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Detailed description of the issue"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value as TicketPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "estimated_hours",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange("due_date", e.target.value)}
              />
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
                  : "Creating..."
                : isEditing
                ? "Update Ticket"
                : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
