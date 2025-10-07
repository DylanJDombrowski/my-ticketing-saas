/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useTasksStore } from "@/stores/tasks";
import { TimeEntryModal } from "@/components/modals/time-entry-modal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { TimeTracker } from "@/components/time-tracker";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Calendar,
  User,
  FileDown,
} from "lucide-react";
import type { TimeEntry } from "@/lib/types";
import { exportTimeEntries } from "@/lib/csv-export";

export default function TimeEntriesPage() {
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split("T")[0];
  });
  const [endDateFilter, setEndDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(
    null
  );
  const [deletingTimeEntry, setDeletingTimeEntry] = useState<TimeEntry | null>(
    null
  );

  const { profile } = useAuthStore();
  const { timeEntries, loading, fetchTimeEntries, deleteTimeEntry } =
    useTimeEntriesStore();
  const { tickets, fetchTickets } = useTasksStore();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTickets(profile.tenant_id);
      loadTimeEntries();
    }
  }, [profile?.tenant_id]);

  const loadTimeEntries = () => {
    if (!profile?.tenant_id) return;

    const filters = {
      startDate: dateFilter,
      endDate: endDateFilter,
      ticketId: ticketFilter === "all" ? undefined : ticketFilter,
      billableOnly: billableFilter === "billable" ? true : undefined,
    };

    fetchTimeEntries(profile.tenant_id, filters);
  };

  useEffect(() => {
    loadTimeEntries();
  }, [dateFilter, endDateFilter, ticketFilter, billableFilter]);

  const handleExportTimeEntries = () => {
    // Format time entries for export
    const exportData = timeEntries.map((entry) => ({
      entry_date: entry.entry_date,
      ticket_title: (entry.ticket as any)?.title || "Unknown",
      client_name: (entry.ticket as any)?.client?.name || "Unknown Client",
      description: entry.description || "",
      hours: entry.hours,
      is_billable: entry.is_billable ? "Yes" : "No",
      user_name: (entry.user as any)?.email || "Unknown User",
    }));

    exportTimeEntries(exportData, `time-entries-${dateFilter}-to-${endDateFilter}`);
  };

  // Set up keyboard shortcuts for this page
  useKeyboardShortcuts([
    {
      key: 'n',
      action: () => setShowTimeEntryModal(true),
      description: 'Create New Time Entry'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: handleExportTimeEntries,
      description: 'Export Time Entries'
    },
    {
      key: 'f',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus Search'
    }
  ]);

  // Listen for custom events from keyboard shortcuts
  useEffect(() => {
    const handleCreateTimeEntry = () => setShowTimeEntryModal(true);
    const handleExportEvent = () => handleExportTimeEntries();

    window.addEventListener('create-time-entry', handleCreateTimeEntry);
    window.addEventListener('export-time-entries', handleExportEvent);

    return () => {
      window.removeEventListener('create-time-entry', handleCreateTimeEntry);
      window.removeEventListener('export-time-entries', handleExportEvent);
    };
  }, []);

  const handleEditTimeEntry = (timeEntry: TimeEntry) => {
    setEditingTimeEntry(timeEntry);
    setShowTimeEntryModal(true);
  };

  const handleDeleteTimeEntry = (timeEntry: TimeEntry) => {
    setDeletingTimeEntry(timeEntry);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTimeEntry) return;

    const { error } = await deleteTimeEntry(deletingTimeEntry.id);

    if (!error) {
      setDeletingTimeEntry(null);
      setShowConfirmModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowTimeEntryModal(false);
    setEditingTimeEntry(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const getTotalHours = () => {
    return timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  const getBillableHours = () => {
    return timeEntries
      .filter((entry) => entry.is_billable)
      .reduce((sum, entry) => sum + entry.hours, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Time Entries</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Time Entries</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportTimeEntries}
            disabled={timeEntries.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowTimeEntryModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        </div>
      </div>

      {/* Time Tracker Widget */}
      <TimeTracker />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(getTotalHours())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Billable Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(getBillableHours())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Non-Billable Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(getTotalHours() - getBillableHours())}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Entry Management</CardTitle>
          <CardDescription>
            Track and manage time spent on tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              <Select value={ticketFilter} onValueChange={setTicketFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by ticket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  {tickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.title} ({ticket.client?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Billable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="billable">Billable Only</SelectItem>
                  <SelectItem value="non-billable">Non-Billable Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Entries Table */}
          {timeEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="rounded-md border min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Ticket</TableHead>
                      <TableHead className="min-w-[120px]">Description</TableHead>
                      <TableHead className="min-w-[80px]">Hours</TableHead>
                      <TableHead className="min-w-[90px]">Billable</TableHead>
                      <TableHead className="min-w-[120px]">User</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">
                              {formatDate(entry.entry_date)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-xs sm:text-sm line-clamp-2">
                              {(entry.ticket as any)?.title || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {(entry.ticket as any)?.client?.name ||
                                "Unknown Client"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] sm:max-w-[200px] truncate text-xs sm:text-sm">
                            {entry.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-mono">
                              {formatHours(entry.hours)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.is_billable ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {entry.is_billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm truncate max-w-[100px]">
                              {(entry.user as any)?.first_name &&
                              (entry.user as any)?.last_name
                                ? `${(entry.user as any).first_name} ${
                                    (entry.user as any).last_name
                                  }`
                                : (entry.user as any)?.email || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditTimeEntry(entry)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTimeEntry(entry)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No time entries found
              </h3>
              <p className="text-gray-500 mb-4">
                No time entries found for the selected date range and filters.
              </p>
              <Button onClick={() => setShowTimeEntryModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TimeEntryModal
        isOpen={showTimeEntryModal}
        onClose={handleCloseModal}
        timeEntry={editingTimeEntry}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}
