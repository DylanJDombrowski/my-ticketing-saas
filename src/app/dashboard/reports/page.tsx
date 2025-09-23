"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { createBrowserClient } from "@/lib/supabase";
import { handleError } from "@/lib/error-handling";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Clock,
  Users,
  Ticket,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileDown,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportReports,
  exportClientActivity,
  exportTeamTimeTracking
} from "@/lib/csv-export";

interface ReportData {
  totalRevenue: number;
  monthlyRevenue: number;
  billableHours: number;
  monthlyBillableHours: number;
  activeClients: number;
  newClientsThisMonth: number;
  resolvedTickets: number;
  monthlyResolvedTickets: number;
  previousMonthRevenue: number;
  previousMonthHours: number;
  previousMonthClients: number;
  previousMonthTickets: number;
}

interface TimeTrackingReport {
  userId: string;
  userName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  ticketCount: number;
}

interface ClientReport {
  clientId: string;
  clientName: string;
  totalHours: number;
  totalRevenue: number;
  ticketCount: number;
  lastActivity: string;
}

type DateRangePreset = 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'this_quarter' | 'this_year' | 'custom';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [timeTrackingData, setTimeTrackingData] = useState<TimeTrackingReport[]>([]);
  const [clientData, setClientData] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { profile } = useAuthStore();

  const supabase = createBrowserClient();

  // Calculate date range based on preset or custom dates
  const getDateRange = () => {
    const now = new Date();

    switch (dateRangePreset) {
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          label: 'This Month'
        };
      case 'last_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
          label: 'Last Month'
        };
      case 'last_30_days':
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
          label: 'Last 30 Days'
        };
      case 'last_90_days':
        return {
          start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          end: now,
          label: 'Last 90 Days'
        };
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return {
          start: quarterStart,
          end: new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0),
          label: 'This Quarter'
        };
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
          label: 'This Year'
        };
      case 'custom':
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
          label: 'Custom Range'
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          label: 'This Month'
        };
    }
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchReportData();
    }
  }, [profile?.tenant_id, dateRangePreset, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Get current date range
      const dateRange = getDateRange();
      const startDateISO = dateRange.start.toISOString();
      const endDateISO = dateRange.end.toISOString();

      // Calculate previous period for comparison
      const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
      const prevEndDate = new Date(dateRange.start.getTime() - 1); // Day before start
      const prevStartDate = new Date(prevEndDate.getTime() - periodDuration);
      const prevStartDateISO = prevStartDate.toISOString();
      const prevEndDateISO = prevEndDate.toISOString();

      // Parallel fetch all required data
      const [
        invoicesResponse,
        timeEntriesResponse,
        clientsResponse,
        ticketsResponse,
        timeTrackingResponse,
        clientRevenueResponse
      ] = await Promise.all([
        // Current period invoices
        supabase
          .from("invoices")
          .select("total_amount, status, created_at")
          .eq("tenant_id", profile!.tenant_id)
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO),

        // Time entries for current period
        supabase
          .from("time_entries")
          .select("hours, is_billable, created_at, user_id, profiles(first_name, last_name)")
          .eq("tenant_id", profile!.tenant_id)
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO),

        // Active clients
        supabase
          .from("clients")
          .select("id, name, created_at")
          .eq("tenant_id", profile!.tenant_id)
          .eq("is_active", true),

        // Resolved tickets in current period
        supabase
          .from("tickets")
          .select("id, status, created_at, client_id")
          .eq("tenant_id", profile!.tenant_id)
          .in("status", ["resolved", "closed"])
          .gte("updated_at", startDateISO)
          .lte("updated_at", endDateISO),

        // Time tracking by user (current period)
        supabase
          .from("time_entries")
          .select(`
            hours,
            is_billable,
            user_id,
            ticket_id,
            profiles(first_name, last_name)
          `)
          .eq("tenant_id", profile!.tenant_id)
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO),

        // Client revenue data (current period)
        supabase
          .from("time_entries")
          .select(`
            hours,
            is_billable,
            ticket_id,
            tickets(client_id, clients(id, name)),
            created_at
          `)
          .eq("tenant_id", profile!.tenant_id)
          .eq("is_billable", true)
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO)
      ]);

      // Process invoice data
      const invoices = invoicesResponse.data || [];
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Process time entries
      const timeEntries = timeEntriesResponse.data || [];
      const billableHours = timeEntries
        .filter(entry => entry.is_billable)
        .reduce((sum, entry) => sum + entry.hours, 0);

      // Process clients
      const clients = clientsResponse.data || [];
      const newClientsThisPeriod = clients.filter(
        client => new Date(client.created_at) >= dateRange.start && new Date(client.created_at) <= dateRange.end
      ).length;

      // Process tickets
      const tickets = ticketsResponse.data || [];

      // Calculate previous period data for comparison
      const previousPeriodInvoices = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("tenant_id", profile!.tenant_id)
        .gte("created_at", prevStartDateISO)
        .lte("created_at", prevEndDateISO);

      const previousPeriodRevenue = (previousPeriodInvoices.data || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      // Process time tracking by user
      const userTimeMap = new Map<string, TimeTrackingReport>();
      (timeTrackingResponse.data || []).forEach(entry => {
        const userId = entry.user_id;
        const userName = entry.profiles
          ? `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim()
          : 'Unknown User';

        if (!userTimeMap.has(userId)) {
          userTimeMap.set(userId, {
            userId,
            userName,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            ticketCount: 0
          });
        }

        const userReport = userTimeMap.get(userId)!;
        userReport.totalHours += entry.hours;
        if (entry.is_billable) {
          userReport.billableHours += entry.hours;
        } else {
          userReport.nonBillableHours += entry.hours;
        }
        userReport.ticketCount += 1;
      });

      // Process client reports
      const clientMap = new Map<string, ClientReport>();
      (clientRevenueResponse.data || []).forEach(entry => {
        const client = entry.tickets?.clients;
        if (!client) return;

        const clientId = client.id;
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName: client.name,
            totalHours: 0,
            totalRevenue: 0,
            ticketCount: 0,
            lastActivity: entry.created_at
          });
        }

        const clientReport = clientMap.get(clientId)!;
        clientReport.totalHours += entry.hours;
        // Estimate revenue at $75/hour (use client rate if available)
        clientReport.totalRevenue += entry.hours * 75;
        clientReport.ticketCount += 1;

        // Update last activity if more recent
        if (new Date(entry.created_at) > new Date(clientReport.lastActivity)) {
          clientReport.lastActivity = entry.created_at;
        }
      });

      setReportData({
        totalRevenue,
        monthlyRevenue: totalRevenue,
        billableHours,
        monthlyBillableHours: billableHours,
        activeClients: clients.length,
        newClientsThisMonth: newClientsThisPeriod,
        resolvedTickets: tickets.length,
        monthlyResolvedTickets: tickets.length,
        previousMonthRevenue: previousPeriodRevenue,
        previousMonthHours: 0, // Would need additional query
        previousMonthClients: 0, // Would need additional query
        previousMonthTickets: 0, // Would need additional query
      });

      setTimeTrackingData(Array.from(userTimeMap.values()));
      setClientData(Array.from(clientMap.values()));

    } catch (error) {
      handleError("Failed to fetch reports data", {
        operation: "fetchReportsData",
        tenantId: profile?.tenant_id,
        error,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="animate-pulse">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const revenueGrowth = reportData ? calculateGrowth(reportData.monthlyRevenue, reportData.previousMonthRevenue) : 0;
  const currentDateRange = getDateRange();

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
  };

  const refreshData = () => {
    fetchReportData();
  };

  const handleExportSummary = () => {
    if (reportData) {
      const filename = `reports-summary-${currentDateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      exportReports(reportData, filename);
    }
  };

  const handleExportClientActivity = () => {
    if (clientData.length > 0) {
      const filename = `client-activity-${currentDateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      exportClientActivity(clientData, filename);
    }
  };

  const handleExportTeamTracking = () => {
    if (timeTrackingData.length > 0) {
      const filename = `team-time-tracking-${currentDateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      exportTeamTimeTracking(timeTrackingData, filename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export Data
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleExportSummary} disabled={!reportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Summary Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTeamTracking} disabled={timeTrackingData.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Team Time Tracking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportClientActivity} disabled={clientData.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Client Activity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Date Range:</Label>
            </div>

            <Select value={dateRangePreset} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRangePreset === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="start-date" className="text-sm">From:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date" className="text-sm">To:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {currentDateRange.label}: {currentDateRange.start.toLocaleDateString()} - {currentDateRange.end.toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData?.monthlyRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span className={revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(revenueGrowth).toFixed(1)}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData?.billableHours?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentDateRange.label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.activeClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{reportData?.newClientsThisMonth || 0} new in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.resolvedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {currentDateRange.label}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Tracking Report */}
      <Card>
        <CardHeader>
          <CardTitle>Time Tracking by Team Member</CardTitle>
          <CardDescription>
            {currentDateRange.label} activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeTrackingData.length > 0 ? (
            <div className="space-y-4">
              {timeTrackingData.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.totalHours.toFixed(1)} total hours • {user.ticketCount} tickets
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">
                        {user.billableHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-muted-foreground">Billable</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600">
                        {user.nonBillableHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-muted-foreground">Non-billable</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No time tracking data found for {currentDateRange.label.toLowerCase()}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Client Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Client Activity</CardTitle>
          <CardDescription>
            Revenue and hours by client ({currentDateRange.label.toLowerCase()})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientData.length > 0 ? (
            <div className="space-y-4">
              {clientData.slice(0, 10).map((client) => (
                <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Last activity: {new Date(client.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {formatCurrency(client.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {client.totalHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-muted-foreground">Hours</p>
                    </div>
                    <Badge variant="outline">
                      {client.ticketCount} tickets
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No client activity data found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
