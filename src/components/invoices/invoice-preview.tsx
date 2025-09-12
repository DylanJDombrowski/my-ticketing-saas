import type { Invoice, PaymentMethod } from "@/lib/types";

interface InvoicePreviewProps {
  invoice: Invoice;
  paymentMethods?: PaymentMethod[];
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString() : "";

export function InvoicePreview({ invoice, paymentMethods }: InvoicePreviewProps) {
  return (
    <div className="p-8 bg-white text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Invoice</h1>
          <p className="text-sm">Invoice #{invoice.invoice_number}</p>
        </div>
        <div className="text-right text-sm">
          <p>Date: {formatDate(invoice.created_at)}</p>
          {invoice.due_date && <p>Due: {formatDate(invoice.due_date)}</p>}
        </div>
      </header>

      <section className="mb-8 text-sm">
        <h2 className="font-semibold mb-2">Bill To</h2>
        <p>{invoice.client?.name}</p>
        {invoice.client?.company && <p>{invoice.client.company}</p>}
        {invoice.client?.email && <p>{invoice.client.email}</p>}
      </section>

      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Hours</th>
            <th className="text-right py-2">Rate</th>
            <th className="text-right py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items?.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">
                {item.description || item.time_entry?.description || ""}
              </td>
              <td className="py-2 text-right">{item.hours}</td>
              <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
              <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8 text-sm">
        <div className="w-48 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({invoice.tax_rate}%)</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      {invoice.payment_instructions && (
        <section className="mb-4 text-sm">
          <h2 className="font-semibold mb-2">Payment Instructions</h2>
          <p className="whitespace-pre-wrap">{invoice.payment_instructions}</p>
        </section>
      )}

      {paymentMethods && paymentMethods.length > 0 && (
        <section className="mb-4 text-sm">
          <h2 className="font-semibold mb-2">Payment Methods</h2>
          <ul className="space-y-2">
            {paymentMethods.map((pm) => {
              const amount = invoice.total_amount.toFixed(2);
              const link = pm.payment_link_template?.replace("{amount}", amount);
              return (
                <li key={pm.id}>
                  <p className="font-medium">{pm.display_name}</p>
                  {link && (
                    <p>
                      <a href={link} className="text-blue-600 underline">
                        {link}
                      </a>
                    </p>
                  )}
                  {pm.instructions && (
                    <p className="whitespace-pre-wrap">{pm.instructions}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {invoice.notes && (
        <section className="text-sm">
          <h2 className="font-semibold mb-2">Notes</h2>
          <p className="whitespace-pre-wrap">{invoice.notes}</p>
        </section>
      )}
    </div>
  );
}

