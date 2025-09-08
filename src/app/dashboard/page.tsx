"use client";

import { useEffect, useState } from "react";
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
  const { profile } = useAuthStore();

  const supabase = createBrowserClient();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.tenant_id]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [clientsResponse, ticketsResponse, timeEntriesResponse] =
        await Promise.all([
          supabase
            .from("clients")
            .select("id", { count: "exact" })
            .eq("tenant_id", profile!.tenant_id)
            .eq("is_active", true),

          supabase
            .from("tickets")
            .select("id, status, due_date")
            .eq("tenant_id", profile!.tenant_id),

          supabase
            .from("time_entries")
            .select("hours, is_billable, created_at")
            .eq("tenant_id", profile!.tenant_id)
            .gte(
              "created_at",
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ).toISOString()
            ),
        ]);

      const tickets = ticketsResponse.data || [];
      const timeEntries = timeEntriesResponse.data || [];

      const now = new Date();
      const overdueTickets = tickets.filter(
        (ticket) =>
          ticket.due_date &&
          new Date(ticket.due_date) < now &&
          ticket.status !== "resolved" &&
          ticket.status !== "closed"
      ).length;

      const dashboardStats: DashboardStats = {
        totalClients: clientsResponse.count || 0,
        totalTickets: tickets.length,
        openTickets: tickets.filter((t) => t.status === "open").length,
        inProgressTickets: tickets.filter((t) => t.status === "in_progress")
          .length,
        resolvedTickets: tickets.filter((t) => t.status === "resolved").length,
        closedTickets: tickets.filter((t) => t.status === "closed").length,
        overdueTickets,
        monthlyHours: timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
        billableHours: timeEntries
          .filter((entry) => entry.is_billable)
          .reduce((sum, entry) => sum + entry.hours, 0),
      };

      setStats(dashboardStats);

      // Fetch recent tickets
      const { data: recentTicketsData } = await supabase
        .from("tickets")
        .select(
          `
          id,
          title,
          status,
          priority,
          created_at,
          client:clients(name)
        `
        )
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: false })
        .limit(5);

      const formattedTickets =
        recentTicketsData?.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client_name: (ticket.client as any)?.name || "Unknown",
          created_at: ticket.created_at,
        })) || [];

      setRecentTickets(formattedTickets);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.first_name || "User"}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.inProgressTickets || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.monthlyHours?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.billableHours?.toFixed(1) || "0.0"} billable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
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
          {recentTickets.length > 0 ? (
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.client_name} •{" "}
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
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
