"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/auth";
import { usePaymentMethodsStore } from "@/stores/payment-methods";
import type { PaymentMethod, PaymentMethodForm } from "@/lib/types";

const methodOptions = [
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "stripe_link", label: "Stripe Link" },
  { value: "custom", label: "Custom" },
];

export default function SettingsPage() {
  const { profile } = useAuthStore();
  const {
    paymentMethods,
    fetchPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  } = usePaymentMethodsStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<PaymentMethodForm>({
    method_type: "paypal",
    display_name: "",
    instructions: "",
    payment_link_template: "",
    is_active: true,
    sort_order: 1,
  });

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchPaymentMethods(profile.tenant_id);
    }
  }, [profile?.tenant_id, fetchPaymentMethods]);

  const resetForm = () => {
    setForm({
      method_type: "paypal",
      display_name: "",
      instructions: "",
      payment_link_template: "",
      is_active: true,
      sort_order: paymentMethods.length + 1,
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (pm: PaymentMethod) => {
    setEditing(pm);
    setForm({
      method_type: pm.method_type,
      display_name: pm.display_name,
      instructions: pm.instructions || "",
      payment_link_template: pm.payment_link_template || "",
      is_active: pm.is_active,
      sort_order: pm.sort_order,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.tenant_id) return;
    if (editing) {
      await updatePaymentMethod(editing.id, form);
    } else {
      await createPaymentMethod(profile.tenant_id, form);
    }
    setOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleAdd}>Add Payment Method</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentMethods.map((pm) => (
            <TableRow key={pm.id}>
              <TableCell>{pm.display_name}</TableCell>
              <TableCell>
                {methodOptions.find((o) => o.value === pm.method_type)?.label ||
                  pm.method_type}
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={pm.is_active}
                  onCheckedChange={(checked) =>
                    updatePaymentMethod(pm.id, { is_active: !!checked })
                  }
                />
              </TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(pm)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deletePaymentMethod(pm.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.method_type}
                onValueChange={(v) => setForm((f) => ({ ...f, method_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={form.display_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea
                value={form.instructions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instructions: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Link Template</Label>
              <Input
                value={form.payment_link_template}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payment_link_template: e.target.value,
                  }))
                }
                placeholder="https://pay.example.com/{amount}"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_active: !!checked }))
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

