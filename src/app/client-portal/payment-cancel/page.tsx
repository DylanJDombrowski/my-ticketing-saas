'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <XCircle className="h-10 w-10 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              No charges were made to your card. You can try again when you're ready.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Need help?</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Contact support if you experienced any issues</li>
              <li>Check your email for the invoice details</li>
              <li>Your invoice is still pending payment</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {invoiceId && (
              <Button asChild className="w-full">
                <Link href={`/client-portal/${invoiceId}`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Try Payment Again
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
