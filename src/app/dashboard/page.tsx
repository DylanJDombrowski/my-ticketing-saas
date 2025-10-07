/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { Users, Ticket, Clock, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalClients: number;
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  overdueTickets: number;
  monthlyHours: number;
  billableHours: number;
}

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  client_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const { profile } = useAuthStore();

  const supabase = createBrowserClient();

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      // Calculate month start once
      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      // Priority 1: Fetch critical stats first for immediate UI update
      const [
        clientsResponse,
        allTicketsResponse,
        timeEntriesResponse
      ] = await Promise.all([
        // Client count only (optimized with head: true)
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true),

        // All tasks for stats calculation (minimal fields)
        supabase
          .from("tasks")
          .select("id, status, due_date")
          .eq("tenant_id", profile.tenant_id),

        // Monthly time entries (minimal fields)
        supabase
          .from("time_entries")
          .select("hours, is_billable")
          .eq("tenant_id", profile.tenant_id)
          .gte("created_at", monthStart)
      ]);

      const tasks = allTicketsResponse.data || [];
      const timeEntries = timeEntriesResponse.data || [];

      // Optimize calculations with single pass
      const now = new Date();
      const taskStats = tasks.reduce(
        (acc, task) => {
          // Count by status
          const status = task.status as keyof typeof acc;
          if (status in acc) {
            acc[status]++;
          }

          // Check if overdue
          if (
            task.due_date &&
            new Date(task.due_date) < now &&
            task.status !== "resolved" &&
            task.status !== "closed"
          ) {
            acc.overdue++;
          }

          return acc;
        },
        {
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          overdue: 0
        }
      );

      // Optimize time calculations with single pass
      const timeStats = timeEntries.reduce(
        (acc, entry) => {
          acc.total += entry.hours;
          if (entry.is_billable) {
            acc.billable += entry.hours;
          }
          return acc;
        },
        { total: 0, billable: 0 }
      );

      const dashboardStats: DashboardStats = {
        totalClients: clientsResponse.count || 0,
        totalTickets: tasks.length,
        openTickets: taskStats.open,
        inProgressTickets: taskStats.in_progress,
        resolvedTickets: taskStats.resolved,
        closedTickets: taskStats.closed,
        overdueTickets: taskStats.overdue,
        monthlyHours: timeStats.total,
        billableHours: timeStats.billable,
      };

      setStats(dashboardStats);
      setLoading(false);

      // Priority 2: Fetch recent tasks in background (non-blocking)
      setTicketsLoading(true);
      try {
        const recentTasksResponse = await supabase
          .from("tasks")
          .select("id, title, status, priority, created_at, client:clients(name)")
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false })
          .limit(5);

        const formattedTasks = (recentTasksResponse.data || []).map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          client_name: (task.client as any)?.name || "Unknown",
          created_at: task.created_at,
        }));

        setRecentTickets(formattedTasks);
      } catch (tasksError) {
        console.error("Error fetching recent tasks:", tasksError);
      } finally {
        setTicketsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoize color functions to avoid recreating on every render
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  // Memoize formatted tickets to avoid recalculating on every render
  const formattedRecentTickets = useMemo(() => {
    return recentTickets.map((ticket) => ({
      ...ticket,
      formattedDate: new Date(ticket.created_at).toLocaleDateString(),
      statusColor: getStatusColor(ticket.status),
      priorityColor: getPriorityColor(ticket.priority),
      formattedStatus: ticket.status.replace("_", " ")
    }));
  }, [recentTickets, getStatusColor, getPriorityColor]);

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.first_name || "User"}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.inProgressTickets || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Monthly Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats?.monthlyHours?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.billableHours?.toFixed(1) || "0.0"} billable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {stats?.overdueTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <CardDescription>
            Latest tickets created in your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : formattedRecentTickets.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {formattedRecentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors space-y-2 sm:space-y-0"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base line-clamp-2">{ticket.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {ticket.client_name} • {ticket.formattedDate}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge className={`${ticket.priorityColor} text-xs`}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={`${ticket.statusColor} text-xs`}>
                      {ticket.formattedStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tickets found. Create your first ticket to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
