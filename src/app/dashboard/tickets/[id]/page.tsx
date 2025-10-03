"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useTicketsStore } from "@/stores/tickets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TicketComments } from "@/components/ticket-comments";
import { TicketModal } from "@/components/modals/ticket-modal";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  Edit,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export default function TicketDetailPage() {
  const [showEditModal, setShowEditModal] = useState(false);
  const params = useParams();
  const router = useRouter();

  const ticketId = params.id as string;
  const { profile } = useAuthStore();
  const { selectedTicket, loading, fetchTicket, updateTicketStatus } =
    useTicketsStore();

  useEffect(() => {
    if (profile?.tenant_id && ticketId) {
      fetchTicket(ticketId);
    }
  }, [profile?.tenant_id, ticketId, fetchTicket]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    await updateTicketStatus(selectedTicket.id, newStatus);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ticket not found
            </h3>
            <p className="text-gray-500">
              The ticket you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{selectedTicket.title}</h1>
            <p className="text-muted-foreground">Ticket details and activity</p>
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Ticket
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Information</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={statusColors[selectedTicket.status]}>
                    {selectedTicket.status.replace("_", " ")}
                  </Badge>
                  <Badge className={priorityColors[selectedTicket.priority]}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTicket.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {selectedTicket.client?.name || "Unknown Client"}
                      {selectedTicket.client?.company && (
                        <span className="text-sm text-muted-foreground ml-1">
                          ({selectedTicket.client.company})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {selectedTicket.assigned_user && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Assigned to
                      </p>
                      <p className="font-medium">
                        {selectedTicket.assigned_user.first_name}{" "}
                        {selectedTicket.assigned_user.last_name}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTicket.due_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {formatDate(selectedTicket.due_date)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Time Tracking
                    </p>
                    <p className="font-medium">
                      {selectedTicket.actual_hours}h logged
                      {selectedTicket.estimated_hours && (
                        <span className="text-sm text-muted-foreground ml-1">
                          / {selectedTicket.estimated_hours}h estimated
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {formatDateTime(selectedTicket.created_at)}
                    {selectedTicket.created_user && (
                      <span className="ml-1">
                        by {selectedTicket.created_user.first_name}{" "}
                        {selectedTicket.created_user.last_name}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {formatDateTime(selectedTicket.updated_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          {profile?.tenant_id && (
            <TicketComments
              ticketId={selectedTicket.id}
              tenantId={profile.tenant_id}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(value: TicketStatus) =>
                    handleStatusChange(value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Priority:</span>
                  <Badge className={priorityColors[selectedTicket.priority]}>
                    {selectedTicket.priority}
                  </Badge>
                </div>

                {selectedTicket.estimated_hours && (
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>
                      {Math.round(
                        (selectedTicket.actual_hours /
                          selectedTicket.estimated_hours) *
                          100
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Ticket
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // This would scroll to comments or focus comment input
                  const input = document.querySelector(
                    '[placeholder="Add a comment..."]'
                  ) as HTMLInputElement | null;
                  input?.focus();
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Comment
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/dashboard/time-entries")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Log Time
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <TicketModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        ticket={selectedTicket}
      />
    </div>
  );
}
