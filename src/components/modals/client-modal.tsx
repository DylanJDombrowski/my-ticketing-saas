"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useClientsStore } from "@/stores/clients";
import type { Client, CreateClientForm } from "@/lib/types";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
}

export function ClientModal({ isOpen, onClose, client }: ClientModalProps) {
  const [formData, setFormData] = useState<CreateClientForm>({
    name: "",
    email: "",
    phone: "",
    company: "",
    hourly_rate: undefined,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { profile } = useAuthStore();
  const { createClient, updateClient } = useClientsStore();

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        company: client.company || "",
        hourly_rate: client.hourly_rate || undefined,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        hourly_rate: undefined,
      });
    }
    setError("");
  }, [client, isOpen]);

  const handleInputChange = (field: keyof CreateClientForm, value: string) => {
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

    try {
      let result;

      if (isEditing && client) {
        result = await updateClient(client.id, formData);
      } else {
        result = await createClient(profile.tenant_id, formData);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the client information below."
              : "Fill in the details to add a new client to your workspace."}
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
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Company name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFormData((prev) => ({ ...prev, hourly_rate: value }));
                }}
                placeholder="150.00"
              />
              <p className="text-sm text-muted-foreground">
                Default hourly rate for billing this client&apos;s work
              </p>
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
                ? "Update Client"
                : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
