/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useClientsStore } from "@/stores/clients";
import { DollarSign, Clock, FileText, Zap } from "lucide-react";
import { QuickInvoiceModal } from "@/components/modals/quick-invoice-modal";

interface DashboardStats {
  revenueThisMonth: number;
  pendingInvoicesAmount: number;
  pendingInvoicesCount: number;
  billableHoursThisMonth: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  client_name: string;
  paid_at?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const { profile } = useAuthStore();
  const { fetchClients } = useClientsStore();

  const supabase = createBrowserClient();

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      // Calculate month start
      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      // Fetch all data in parallel
      const [invoicesResponse, timeEntriesResponse] = await Promise.all([
        // All invoices
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, status, total_amount, paid_at, created_at, client:clients(name)"
          )
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false }),

        // Billable hours this month
        supabase
          .from("time_entries")
          .select("hours")
          .eq("tenant_id", profile.tenant_id)
          .eq("is_billable", true)
          .gte("entry_date", monthStart),
      ]);

      const invoices = invoicesResponse.data || [];
      const timeEntries = timeEntriesResponse.data || [];

      // Calculate revenue this month (paid invoices)
      const revenueThisMonth = invoices
        .filter(
          (inv) =>
            inv.status === "paid" && inv.paid_at && inv.paid_at >= monthStart
        )
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      // Calculate pending invoices (sent but not paid)
      const pendingInvoices = invoices.filter(
        (inv) =>
          inv.status === "sent" ||
          inv.status === "overdue" ||
          inv.status === "partial"
      );
      const pendingAmount = pendingInvoices.reduce(
        (sum, inv) => sum + inv.total_amount,
        0
      );

      // Calculate billable hours this month
      const billableHours = timeEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0
      );

      const dashboardStats: DashboardStats = {
        revenueThisMonth,
        pendingInvoicesAmount: pendingAmount,
        pendingInvoicesCount: pendingInvoices.length,
        billableHoursThisMonth: billableHours,
      };

      setStats(dashboardStats);

      // Format recent invoices (last 5)
      const formattedInvoices = invoices.slice(0, 5).map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        total_amount: invoice.total_amount,
        client_name: (invoice.client as any)?.name || "Unknown",
        paid_at: invoice.paid_at,
        created_at: invoice.created_at,
      }));

      setRecentInvoices(formattedInvoices);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchDashboardData();
      fetchClients(profile.tenant_id);
    }
  }, [fetchDashboardData, profile?.tenant_id, fetchClients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="animate-pulse">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name || "User"}!
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowQuickInvoice(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
        >
          <Zap className="mr-2 h-5 w-5" />
          Quick Invoice
        </Button>
      </div>

      {/* Stats Cards - Invoice-First Focus */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.revenueThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats?.pendingInvoicesAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingInvoicesCount || 0} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hours This Month
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.billableHoursThisMonth || 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Billable only</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              onClick={() => setShowQuickInvoice(true)}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Zap className="mr-2 h-4 w-4" />
              Quick Invoice
            </Button>
            <Link href="/dashboard/time-entries">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Clock className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Your latest invoices and their status
              </CardDescription>
            </div>
            <Link href="/dashboard/invoices">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentInvoices.length > 0 ? (
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{invoice.client_name}</span>
                      <span>•</span>
                      <span>
                        {invoice.paid_at
                          ? `Paid ${formatDate(invoice.paid_at)}`
                          : `Created ${formatDate(invoice.created_at)}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-muted-foreground mb-4">No invoices yet</p>
              <Button onClick={() => setShowQuickInvoice(true)}>
                <Zap className="mr-2 h-4 w-4" />
                Create Your First Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Invoice Modal */}
      <QuickInvoiceModal
        isOpen={showQuickInvoice}
        onClose={() => setShowQuickInvoice(false)}
      />
    </div>
  );
}
