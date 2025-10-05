"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notifications";
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  FileText,
  Filter,
  RefreshCw,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

interface TimeEntry {
  id: string;
  description: string;
  hours: number;
  is_billable: boolean;
  entry_date: string;
  approval_status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  ticket: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
      hourly_rate?: number;
    };
  };
}

interface BulkApprovalRequest {
  time_entry_ids: string[];
  approval_status: "approved" | "rejected";
  rejection_reason?: string;
}

const statusColors = {
  submitted: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};

const statusIcons = {
  submitted: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  draft: FileText,
};

export function TimeEntryApproval() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [bulkApproving, setBulkApproving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionReason, setShowRejectionReason] = useState(false);

  useEffect(() => {
    fetchTimeEntries();
  }, [statusFilter]);

  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/time-entries/approval?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch time entries");
      }

      setTimeEntries(data.time_entries || []);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      notify.error("Failed to fetch time entries");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApproval = async (action: "approved" | "rejected") => {
    if (selectedEntries.length === 0) {
      notify.error("Please select time entries to approve/reject");
      return;
    }

    if (action === "rejected" && !rejectionReason.trim()) {
      setShowRejectionReason(true);
      notify.error("Please provide a reason for rejection");
      return;
    }

    setBulkApproving(true);
    try {
      const response = await fetch("/api/time-entries/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time_entry_ids: selectedEntries,
          approval_status: action,
          rejection_reason: action === "rejected" ? rejectionReason : undefined,
        } as BulkApprovalRequest),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process approvals");
      }

      notify.success(result.message);
      setSelectedEntries([]);
      setRejectionReason("");
      setShowRejectionReason(false);
      fetchTimeEntries();
    } catch (error) {
      console.error("Error processing approvals:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to process approvals"
      );
    } finally {
      setBulkApproving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculateAmount = (entry: TimeEntry) => {
    const rate = entry.ticket.client.hourly_rate ?? 75; // Default rate
    return rate * entry.hours;
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntries.length === timeEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(timeEntries.map((entry) => entry.id));
    }
  };

  // Calculate statistics
  const pendingEntries = timeEntries.filter(
    (e) => e.approval_status === "submitted"
  );
  const approvedEntries = timeEntries.filter(
    (e) => e.approval_status === "approved"
  );
  const rejectedEntries = timeEntries.filter(
    (e) => e.approval_status === "rejected"
  );

  const pendingHours = pendingEntries.reduce((sum, e) => sum + e.hours, 0);
  const pendingAmount = pendingEntries.reduce(
    (sum, e) => sum + calculateAmount(e),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-blue-600" />
            Time Entry Approval
          </h1>
          <p className="text-muted-foreground">
            Review and approve time entries for billing
          </p>
        </div>
        <Button onClick={fetchTimeEntries} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Approval
                </p>
                <p className="text-2xl font-bold">{pendingEntries.length}</p>
                <p className="text-xs text-muted-foreground">
                  {pendingHours.toFixed(1)} hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedEntries.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedEntries.length} selected
                </span>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkApproval("approved")}
                  disabled={bulkApproving}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      setShowRejectionReason(true);
                    } else {
                      handleBulkApproval("rejected");
                    }
                  }}
                  disabled={bulkApproving}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Selected
                </Button>
              </div>
            )}
          </div>

          {/* Rejection Reason Input */}
          {showRejectionReason && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Label
                htmlFor="rejection-reason"
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Reason for Rejection *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting these time entries..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkApproval("rejected")}
                  disabled={!rejectionReason.trim() || bulkApproving}
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectionReason(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <p className="text-sm text-muted-foreground">
            {timeEntries.length} time entries found
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : timeEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEntries.length === timeEntries.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Client/Ticket</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={() => toggleEntrySelection(entry.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {entry.user.first_name} {entry.user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm">{entry.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge
                            variant={
                              entry.is_billable ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {entry.is_billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell className="font-medium">
                      {entry.hours}h
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {entry.ticket.client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.ticket.title}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.is_billable
                        ? formatCurrency(calculateAmount(entry))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(entry.approval_status)}
                        <Badge
                          className={
                            statusColors[
                              entry.approval_status as keyof typeof statusColors
                            ]
                          }
                        >
                          {entry.approval_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No time entries found
              </h3>
              <p className="text-gray-500">
                No time entries match your current filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
