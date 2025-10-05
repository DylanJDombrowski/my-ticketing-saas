"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Optionally fetch payment details from your API
      // For now, just show success message
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600 mb-2">
              Thank you for your payment. Your invoice has been marked as paid
              and you should receive a confirmation email shortly.
            </p>
            {sessionId && (
              <p className="text-xs text-gray-500 font-mono">
                Session ID: {sessionId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              What&apos;s next?
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>You&apos;ll receive a payment confirmation email</li>
              <li>Your invoice status has been updated to &quot;Paid&quot;</li>
              <li>A receipt will be sent to your email address</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
