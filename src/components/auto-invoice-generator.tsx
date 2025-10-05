"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/auth";
import { useClientsStore } from "@/stores/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notifications";
import { Zap, Calendar, DollarSign, Users, FileText, Mail } from "lucide-react";
import type { AutoInvoiceGenerationForm } from "@/lib/types";

interface AutoInvoiceResult {
  message: string;
  invoices: Array<{
    id: string;
    invoice_number: string;
    client: {
      name: string;
      email: string;
    };
    total_amount: number;
    time_entries_count: number;
  }>;
  summary: {
    total_invoices: number;
    total_amount: number;
    clients_billed: number;
  };
}

export function AutoInvoiceGenerator() {
  const { profile } = useAuthStore();
  const { clients } = useClientsStore();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AutoInvoiceResult | null>(null);

  const form = useForm<AutoInvoiceGenerationForm>({
    defaultValues: {
      client_id: "",
      date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days ago
      date_range_end: new Date().toISOString().split("T")[0], // today
      include_non_billable: false,
      auto_approve: false,
      send_notification: false,
    },
  });

  const onSubmit = async (data: AutoInvoiceGenerationForm) => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/invoices/auto-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate invoices");
      }

      setResults(result);
      notify.success(result.message);
    } catch (error) {
      console.error("Error generating invoices:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to generate invoices"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Automated Invoice Generation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate invoices automatically from unbilled time entries. Select
            criteria and let the system create professional invoices for you.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client (Optional)</Label>
                <Select
                  value={form.watch("client_id") || "ALL_CLIENTS"}
                  onValueChange={(value) => form.setValue("client_id", value === "ALL_CLIENTS" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_CLIENTS">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to generate invoices for all clients with unbilled
                  time
                </p>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  {...form.register("date_range_start", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  {...form.register("date_range_end", { required: true })}
                />
              </div>
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-4">
              <h4 className="font-medium">Generation Options</h4>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-non-billable"
                    checked={form.watch("include_non_billable")}
                    onCheckedChange={(checked) =>
                      form.setValue("include_non_billable", checked as boolean)
                    }
                  />
                  <Label htmlFor="include-non-billable" className="text-sm">
                    Include non-billable time entries
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-approve"
                    checked={form.watch("auto_approve")}
                    onCheckedChange={(checked) =>
                      form.setValue("auto_approve", checked as boolean)
                    }
                  />
                  <Label htmlFor="auto-approve" className="text-sm">
                    Auto-approve and mark as &quot;Sent&quot; (otherwise saved
                    as &quot;Draft&quot;)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-notification"
                    checked={form.watch("send_notification")}
                    onCheckedChange={(checked) =>
                      form.setValue("send_notification", checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="send-notification"
                    className="text-sm flex items-center gap-1"
                  >
                    <Mail className="h-4 w-4" />
                    Queue email notifications to clients
                  </Label>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Generating Invoices..." : "Generate Invoices"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <FileText className="h-5 w-5" />
              Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Invoices Created
                    </p>
                    <p className="text-lg font-semibold">
                      {results.summary.total_invoices}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-lg font-semibold">
                      ${results.summary.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Clients Billed
                    </p>
                    <p className="text-lg font-semibold">
                      {results.summary.clients_billed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice List */}
              {results.invoices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Generated Invoices:</h4>
                  <div className="space-y-2">
                    {results.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client.name} ({invoice.client.email})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.time_entries_count} time entries
                          </p>
                        </div>
                        <Badge variant="secondary">
                          ${invoice.total_amount.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
