"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Rocket, Check, X } from "lucide-react";
import { toast } from "sonner";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
}

export function UpgradePrompt({
  isOpen,
  onClose,
  currentCount,
  limit,
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to start upgrade process");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Upgrade to Pro</DialogTitle>
              <DialogDescription className="text-base">
                You&apos;ve reached your free plan limit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Your usage</p>
            <p className="text-2xl font-bold text-gray-900">
              {currentCount} / {limit} invoices
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Upgrade to create unlimited invoices
            </p>
          </div>

          <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Billable Pro</h3>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">$6.99</p>
                <p className="text-sm text-gray-600">/month</p>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  <strong>Unlimited invoices</strong> - create as many as you need
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  <strong>Unlimited clients</strong> - manage all your customers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  <strong>Time tracking</strong> - log billable hours
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  <strong>Client portal</strong> - secure invoice access
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  <strong>Email notifications</strong> - automated reminders
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Can&apos;t upgrade right now?</strong> Send us feedback about your experience and we&apos;ll credit you with one additional invoice. Email us at support@trybillable.com
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {loading ? "Processing..." : "Upgrade Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
