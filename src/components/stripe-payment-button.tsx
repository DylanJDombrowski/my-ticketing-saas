'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentButtonProps {
  invoiceId: string;
  amount: number;
  invoiceNumber: string;
  disabled?: boolean;
}

export function StripePaymentButton({
  invoiceId,
  amount,
  invoiceNumber,
  disabled = false,
}: StripePaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create Stripe Checkout Session
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || loading}
      className="w-full sm:w-auto"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to payment...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay ${amount.toFixed(2)} with Card
        </>
      )}
    </Button>
  );
}
