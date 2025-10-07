"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CreditCard, LayoutDashboard, FileText, Loader2 } from "lucide-react";

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  invoiceNumber: string;
  clientEmail: string;
  totalAmount: number;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  invoiceNumber,
  clientEmail,
  totalAmount,
}: SendInvoiceModalProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in parent component
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Invoice to Client
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            This will send invoice <strong>#{invoiceNumber}</strong> to{" "}
            <strong>{clientEmail}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Invoice Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* What the client will receive */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">
              📧 Your client will receive:
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Professional invoice email</p>
                  <p className="text-xs text-gray-500">
                    Beautifully formatted with your company branding
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">&quot;Pay This Invoice&quot; button</p>
                  <p className="text-xs text-gray-500">
                    Direct link to securely pay online with card
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <LayoutDashboard className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Client Portal access</p>
                  <p className="text-xs text-gray-500">
                    Secure link to view all invoices, tasks, and payment history
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">PDF download option</p>
                  <p className="text-xs text-gray-500">
                    Printable invoice for their records
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-purple-800">
              <strong>🔒 Secure Portal Link:</strong> A unique 30-day access link will be
              automatically generated for {clientEmail}. They can use this link to access their
              portal anytime without needing to log in.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
