"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notifications";
import {
  Shield,
  Key,
  Calendar,
  Link2,
  Copy,
  ExternalLink,
  Mail,
  Settings,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface ClientPortalManagerProps {
  client: Client;
}

interface PortalAccess {
  access_token: string;
  portal_url: string;
  expires_in_days: number;
}

export function ClientPortalManager({ client }: ClientPortalManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);

  const generatePortalAccess = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client-portal/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          expires_in_days: expiresInDays,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate portal access");
      }

      setPortalAccess(result);
      notify.success("Client portal access generated successfully");
    } catch (error) {
      console.error("Error generating portal access:", error);
      notify.error(
        error instanceof Error
          ? error.message
          : "Failed to generate portal access"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success("Copied to clipboard");
    } catch (error) {
      notify.error("Failed to copy to clipboard");
    }
  };

  const sendPortalEmail = async () => {
    if (!portalAccess) return;

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: client.email,
          notification_type: "client_portal_access",
          subject: "Your Client Portal Access",
          message_body: `
Hello ${client.name},

You now have access to your client portal where you can view invoices, track tickets, and manage your account.

Access your portal here: ${window.location.origin}${portalAccess.portal_url}

This access link will expire in ${portalAccess.expires_in_days} days.

If you have any questions, please don't hesitate to contact us.

Best regards,
Your Support Team
          `.trim(),
          send_immediately: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      notify.success("Portal access email sent to client");
    } catch (error) {
      console.error("Error sending email:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to send email"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Portal Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Client Portal Access - {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium">{client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">{client.email}</span>
              </div>
              {client.company && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Company:
                  </span>
                  <span className="text-sm font-medium">{client.company}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {!portalAccess ? (
            /* Generate Access Form */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Generate Portal Access
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create a secure access token for the client to view their
                  invoices and tickets.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="expires-in-days"
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Access Duration (Days)
                  </Label>
                  <Input
                    id="expires-in-days"
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) =>
                      setExpiresInDays(parseInt(e.target.value) || 30)
                    }
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    The portal access will expire after this many days.
                    Recommended: 30 days.
                  </p>
                </div>

                <Button
                  onClick={generatePortalAccess}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Generating..." : "Generate Portal Access"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Generated Access Results */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                  <Key className="h-5 w-5" />
                  Portal Access Generated
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Share this access link with your client. Keep it secure as
                  anyone with this link can access the client portal.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Portal URL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Link2 className="h-4 w-4" />
                    Portal URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}${portalAccess.portal_url}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}${portalAccess.portal_url}`
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${window.location.origin}${portalAccess.portal_url}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={portalAccess.access_token}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(portalAccess.access_token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expiry Info */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">
                      Expires in {portalAccess.expires_in_days} days
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Access will expire on{" "}
                      {new Date(
                        Date.now() +
                          portalAccess.expires_in_days * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button onClick={sendPortalEmail} className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Portal Link to Client
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPortalAccess(null);
                      setOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Note */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Settings className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Security Notice</p>
              <p className="text-yellow-700 mt-1">
                This portal link provides access to sensitive client information
                including invoices and tickets. Only share this link directly
                with the authorized client through secure channels.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
