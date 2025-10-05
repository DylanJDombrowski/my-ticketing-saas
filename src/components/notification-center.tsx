"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notifications";
import {
  Bell,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Filter,
} from "lucide-react";

interface NotificationLog {
  id: string;
  recipient_email: string;
  notification_type: string;
  subject: string;
  message_body: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusIcons = {
  pending: Clock,
  processing: RefreshCw,
  sent: CheckCircle,
  failed: XCircle,
};

const typeColors = {
  invoice_sent: "bg-blue-100 text-blue-800",
  invoice_overdue: "bg-red-100 text-red-800",
  ticket_comment: "bg-green-100 text-green-800",
  ticket_status_change: "bg-purple-100 text-purple-800",
  sla_alert: "bg-orange-100 text-orange-800",
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sending, setSending] = useState(false);

  // Send notification form state
  const [recipient, setRecipient] = useState("");
  const [notificationType, setNotificationType] =
    useState<string>("invoice_sent");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/notifications/send?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch notifications");
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      notify.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!recipient || !subject || !messageBody) {
      notify.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: recipient,
          notification_type: notificationType,
          subject,
          message_body: messageBody,
          send_immediately: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send notification");
      }

      notify.success(result.message);

      // Clear form
      setRecipient("");
      setSubject("");
      setMessageBody("");

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error("Error sending notification:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to send notification"
      );
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const filteredNotifications = notifications.filter((notification) => {
    const statusMatch =
      statusFilter === "all" || notification.status === statusFilter;
    const typeMatch =
      typeFilter === "all" || notification.notification_type === typeFilter;
    return statusMatch && typeMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-blue-600" />
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor email notifications
          </p>
        </div>
        <Button onClick={fetchNotifications} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">Notification History</TabsTrigger>
          <TabsTrigger value="compose">Compose & Send</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                      <SelectItem value="invoice_overdue">
                        Invoice Overdue
                      </SelectItem>
                      <SelectItem value="ticket_comment">
                        Ticket Comment
                      </SelectItem>
                      <SelectItem value="ticket_status_change">
                        Ticket Status Change
                      </SelectItem>
                      <SelectItem value="sla_alert">SLA Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">
                      {
                        notifications.filter((n) => n.status === "pending")
                          .length
                      }
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
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold">
                      {notifications.filter((n) => n.status === "sent").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold">
                      {
                        notifications.filter((n) => n.status === "failed")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{notifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredNotifications.length} notification(s) found
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {notification.subject}
                            </h4>
                            <Badge
                              className={
                                typeColors[
                                  notification.notification_type as keyof typeof typeColors
                                ]
                              }
                            >
                              {notification.notification_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            To: {notification.recipient_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <Badge
                            className={
                              statusColors[
                                notification.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {notification.status}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm">{notification.message_body}</p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Created: {formatDate(notification.created_at)}
                        </span>
                        {notification.sent_at && (
                          <span>Sent: {formatDate(notification.sent_at)}</span>
                        )}
                      </div>

                      {notification.error_message && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <AlertTriangle className="h-4 w-4" />
                          {notification.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No notifications found
                  </h3>
                  <p className="text-gray-500">
                    No notifications match your current filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Notification
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Send a custom notification to clients or team members
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Email *</Label>
                  <Input
                    id="recipient"
                    type="email"
                    placeholder="client@example.com"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select
                    value={notificationType}
                    onValueChange={setNotificationType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                      <SelectItem value="invoice_overdue">
                        Invoice Overdue
                      </SelectItem>
                      <SelectItem value="ticket_comment">
                        Ticket Comment
                      </SelectItem>
                      <SelectItem value="ticket_status_change">
                        Ticket Status Change
                      </SelectItem>
                      <SelectItem value="sla_alert">SLA Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Notification subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Your message content..."
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />
              </div>

              <Separator />

              <Button
                onClick={sendNotification}
                disabled={sending || !recipient || !subject || !messageBody}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
