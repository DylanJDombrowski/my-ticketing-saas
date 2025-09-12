"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth";
import { useInvoicesStore } from "@/stores/invoices";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useClientsStore } from "@/stores/clients";

const RevenueChart = dynamic(
  () => import("@/components/charts/revenue-chart"),
  { ssr: false }
);
const TimeEntryChart = dynamic(
  () => import("@/components/charts/time-entry-chart"),
  { ssr: false }
);

export default function ReportsPage() {
  const { profile } = useAuthStore();
  const { invoiceStats, fetchInvoiceStats } = useInvoicesStore();
  const { timeEntryStats, fetchTimeEntryStats } = useTimeEntriesStore();
  const { clients, fetchClients } = useClientsStore();

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    clientId: "",
  });

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchClients(profile.tenant_id);
    }
  }, [profile?.tenant_id, fetchClients]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchInvoiceStats(profile.tenant_id, filters);
      fetchTimeEntryStats(profile.tenant_id, filters);
    }
  }, [profile?.tenant_id, filters, fetchInvoiceStats, fetchTimeEntryStats]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
          className="w-48"
        />
        <Input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
          className="w-48"
        />
        <Select
          name="clientId"
          value={filters.clientId}
          onValueChange={(val) => handleFilterChange("clientId", val)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoiceStats?.totalRevenue.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoiceStats?.outstandingAmount.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billable Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntryStats?.billableHours.toFixed(2) || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceStats && (
              <RevenueChart data={invoiceStats.revenueByMonth} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {timeEntryStats && (
              <TimeEntryChart data={timeEntryStats.hoursByDay} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
