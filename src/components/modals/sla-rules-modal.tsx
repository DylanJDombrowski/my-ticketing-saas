"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";

interface SLARule {
  id: string;
  client_id: string | null;
  ticket_priority: "low" | "medium" | "high" | "urgent";
  response_time_hours: number | null;
  resolution_time_hours: number | null;
  is_active: boolean;
  client?: {
    id: string;
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

interface SLARulesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const supabase = createBrowserClient();

export function SLARulesModal({
  open,
  onClose,
  onSuccess,
}: SLARulesModalProps) {
  const { profile } = useAuthStore();
  const [slaRules, setSlaRules] = useState<SLARule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<SLARule | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    ticket_priority: "medium" as "low" | "medium" | "high" | "urgent",
    response_time_hours: "",
    resolution_time_hours: "",
    is_active: true,
  });

  useEffect(() => {
    if (open && profile?.tenant_id) {
      loadData();
    }
  }, [open, profile?.tenant_id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      // Load SLA rules
      const { data: rules, error: rulesError } = await supabase
        .from("sla_rules")
        .select(
          `
          *,
          client:clients(id, name)
        `
        )
        .order("ticket_priority", { ascending: false });

      if (rulesError) throw rulesError;

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (clientsError) throw clientsError;

      setSlaRules(rules || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error loading SLA rules data:", error);
      toast.error("Failed to load SLA rules");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      const ruleData = {
        tenant_id: profile.tenant_id,
        client_id: formData.client_id || null,
        ticket_priority: formData.ticket_priority,
        response_time_hours: formData.response_time_hours
          ? parseInt(formData.response_time_hours)
          : null,
        resolution_time_hours: formData.resolution_time_hours
          ? parseInt(formData.resolution_time_hours)
          : null,
        is_active: formData.is_active,
      };

      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from("sla_rules")
          .update(ruleData)
          .eq("id", editingRule.id);

        if (error) throw error;

        toast.success("SLA rule updated successfully");
      } else {
        // Create new rule
        const { error } = await supabase.from("sla_rules").insert([ruleData]);

        if (error) throw error;

        toast.success("SLA rule created successfully");
      }

      // Reset form and reload data
      resetForm();
      await loadData();
      onSuccess();
    } catch (error) {
      console.error("Error saving SLA rule:", error);
      toast.error("Failed to save SLA rule");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: SLARule) => {
    setEditingRule(rule);
    setFormData({
      client_id: rule.client_id || "",
      ticket_priority: rule.ticket_priority,
      response_time_hours: rule.response_time_hours?.toString() || "",
      resolution_time_hours: rule.resolution_time_hours?.toString() || "",
      is_active: rule.is_active,
    });
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this SLA rule?")) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("sla_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      toast.success("SLA rule deleted successfully");
      await loadData();
      onSuccess();
    } catch (error) {
      console.error("Error deleting SLA rule:", error);
      toast.error("Failed to delete SLA rule");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      client_id: "",
      ticket_priority: "medium",
      response_time_hours: "",
      resolution_time_hours: "",
      is_active: true,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage SLA Rules</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRule ? "Edit SLA Rule" : "Create New SLA Rule"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select
                    value={formData.client_id || "ALL_CLIENTS"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, client_id: value === "ALL_CLIENTS" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_CLIENTS">All clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Ticket Priority</Label>
                  <Select
                    value={formData.ticket_priority}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        ticket_priority: value,
                      }))
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

                <div className="space-y-2">
                  <Label htmlFor="response_time">Response Time (hours)</Label>
                  <Input
                    id="response_time"
                    type="number"
                    min="1"
                    placeholder="e.g., 4"
                    value={formData.response_time_hours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        response_time_hours: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution_time">
                    Resolution Time (hours)
                  </Label>
                  <Input
                    id="resolution_time"
                    type="number"
                    min="1"
                    placeholder="e.g., 24"
                    value={formData.resolution_time_hours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        resolution_time_hours: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {editingRule ? "Update Rule" : "Create Rule"}
                  </Button>
                  {editingRule && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Rules List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing SLA Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : slaRules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No SLA rules configured yet
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {slaRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getPriorityColor(rule.ticket_priority)}
                          >
                            {rule.ticket_priority}
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="font-medium">
                          {rule.client?.name || "All Clients"}
                        </div>
                        <div className="text-muted-foreground">
                          {rule.response_time_hours &&
                            `Response: ${rule.response_time_hours}h`}
                          {rule.response_time_hours &&
                            rule.resolution_time_hours &&
                            " • "}
                          {rule.resolution_time_hours &&
                            `Resolution: ${rule.resolution_time_hours}h`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
