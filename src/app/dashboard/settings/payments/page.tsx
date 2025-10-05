"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notifications";
import { CreditCard, Check, AlertCircle, ExternalLink } from "lucide-react";

interface StripeStatus {
  connected: boolean;
  accountId?: string;
  status?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

function PaymentsSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({
    connected: false,
  });

  // Check for return parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const refresh = searchParams.get("refresh");

    if (success === "true") {
      notify.success("Stripe account connected successfully!");
      // Remove query params
      router.replace("/dashboard/settings/payments");
    } else if (refresh === "true") {
      notify.error("Stripe onboarding incomplete. Please try again.");
      router.replace("/dashboard/settings/payments");
    }
  }, [searchParams, router]);

  // Fetch Stripe account status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stripe/connect/status");
      const data = await response.json();

      if (response.ok) {
        setStripeStatus(data);
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Start Stripe Connect onboarding
  const handleConnect = async () => {
    try {
      setConnecting(true);
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start onboarding");
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to connect Stripe"
      );
      setConnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!stripeStatus.connected) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Connected
        </Badge>
      );
    }

    if (stripeStatus.status === "active") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <Check className="h-3 w-3" />
          Active
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1 bg-yellow-600">
        <AlertCircle className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground">
          Manage your payment processing and Stripe account
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Accept payments directly from your clients
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeStatus.connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to accept credit card payments for
                your invoices. Stripe handles all payment processing securely.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  What you&apos;ll need:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Business information (name, address, tax ID)</li>
                  <li>Bank account for payouts</li>
                  <li>Personal identification (for verification)</li>
                </ul>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                size="lg"
                className="w-full sm:w-auto"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {connecting ? "Connecting..." : "Connect Stripe Account"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Account ID
                  </span>
                  <span className="text-sm font-mono">
                    {stripeStatus.accountId}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Accept Payments
                  </span>
                  <span className="text-sm">
                    {stripeStatus.chargesEnabled ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Enabled
                      </span>
                    ) : (
                      <span className="text-gray-500">Disabled</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Payouts</span>
                  <span className="text-sm">
                    {stripeStatus.payoutsEnabled ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Enabled
                      </span>
                    ) : (
                      <span className="text-gray-500">Disabled</span>
                    )}
                  </span>
                </div>
              </div>

              {stripeStatus.status !== "active" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Your Stripe account setup is incomplete. Complete the
                    onboarding process to start accepting payments.
                  </p>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Setup
                  </Button>
                </div>
              )}

              {stripeStatus.status === "active" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Your Stripe account is fully configured and ready to
                    accept payments!
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button onClick={fetchStatus} variant="outline" size="sm">
                  Refresh Status
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Connect Your Stripe Account</h4>
                <p className="text-sm text-muted-foreground">
                  Complete the secure onboarding process with Stripe
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Create & Send Invoices</h4>
                <p className="text-sm text-muted-foreground">
                  Your invoices will include a &quot;Pay Now&quot; button
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Get Paid Instantly</h4>
                <p className="text-sm text-muted-foreground">
                  Payments go directly to your bank account via Stripe
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentsSettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <PaymentsSettingsContent />
    </Suspense>
  );
}
