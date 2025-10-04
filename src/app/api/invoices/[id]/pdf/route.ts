import Mustache from "mustache";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // SECURITY: Get current user and verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Get user's tenant_id for isolation
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, tenant:tenants(id, name)")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // SECURITY: Query invoice with tenant isolation
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(id, name, email, company),
      line_items:invoice_line_items(
        id,
        description,
        hours,
        rate,
        amount,
        time_entry:time_entries(
          id,
          description,
          entry_date,
          ticket:tickets(id, title)
        )
      )
    `)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)  // CRITICAL: Ensure tenant isolation
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const template = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice {{invoice_number}}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }

          .company-info {
            flex: 1;
          }

          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }

          .company-details {
            color: #64748b;
            font-size: 14px;
          }

          .invoice-info {
            text-align: right;
            flex: 1;
          }

          .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
          }

          .invoice-number {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 15px;
          }

          .invoice-dates {
            font-size: 14px;
            color: #64748b;
          }

          .billing-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }

          .billing-info {
            flex: 1;
            margin-right: 40px;
          }

          .billing-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }

          .client-details {
            color: #4b5563;
            font-size: 14px;
            line-height: 1.5;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .items-table th {
            background-color: #f8fafc;
            color: #374151;
            font-weight: 600;
            padding: 15px 10px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
            font-size: 14px;
          }

          .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }

          .items-table tr:hover {
            background-color: #f9fafb;
          }

          .text-right {
            text-align: right;
          }

          .text-center {
            text-align: center;
          }

          .totals-section {
            margin-left: auto;
            width: 300px;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
          }

          .total-row.final {
            border-top: 2px solid #1e40af;
            margin-top: 15px;
            padding-top: 15px;
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
          }

          .notes-section {
            margin-bottom: 30px;
          }

          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }

          .notes-content {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            color: #4b5563;
            font-size: 14px;
            line-height: 1.6;
          }

          .payment-section {
            background-color: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #1e40af;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .status-{{status}} {
            background-color: #dcfce7;
            color: #166534;
          }

          .amount {
            font-weight: 600;
            color: #374151;
          }

          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
            .header {
              margin-bottom: 30px;
            }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <div class="company-name">{{company_name}}</div>
            <div class="company-details">
              Professional Services<br>
              {{#company_email}}{{company_email}}<br>{{/company_email}}
              {{#company_phone}}{{company_phone}}{{/company_phone}}
            </div>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">#{{invoice_number}}</div>
            <div class="invoice-dates">
              <strong>Date:</strong> {{issue_date}}<br>
              {{#due_date}}<strong>Due:</strong> {{due_date}}<br>{{/due_date}}
              <span class="status-badge status-{{status}}">{{status}}</span>
            </div>
          </div>
        </div>

        <!-- Billing Information -->
        <div class="billing-section">
          <div class="billing-info">
            <div class="billing-title">Bill To:</div>
            <div class="client-details">
              <strong>{{client_name}}</strong><br>
              {{#client_company}}{{client_company}}<br>{{/client_company}}
              {{#client_email}}{{client_email}}{{/client_email}}
            </div>
          </div>
          <div class="billing-info">
            <div class="billing-title">Invoice Details:</div>
            <div class="client-details">
              <strong>Total Hours:</strong> {{total_hours}}<br>
              <strong>Billing Period:</strong> {{billing_period}}<br>
              <strong>Payment Terms:</strong> Net 30
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Date</th>
              <th class="text-center">Hours</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {{#line_items}}
            <tr>
              <td>
                <strong>{{description}}</strong>
                {{#ticket_title}}<br><small style="color: #64748b;">Ticket: {{ticket_title}}</small>{{/ticket_title}}
              </td>
              <td class="text-center">{{entry_date}}</td>
              <td class="text-center">{{hours}}</td>
              <td class="text-right">${{rate}}</td>
              <td class="text-right amount">${{amount}}</td>
            </tr>
            {{/line_items}}
            {{^line_items}}
            <tr>
              <td colspan="5" class="text-center" style="padding: 40px; color: #64748b;">
                No line items found for this invoice
              </td>
            </tr>
            {{/line_items}}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span class="amount">${{subtotal}}</span>
          </div>
          {{#tax_rate}}
          <div class="total-row">
            <span>Tax ({{tax_rate}}%):</span>
            <span class="amount">${{tax_amount}}</span>
          </div>
          {{/tax_rate}}
          <div class="total-row final">
            <span>Total:</span>
            <span>${{total_amount}}</span>
          </div>
        </div>

        <!-- Notes -->
        {{#notes}}
        <div class="notes-section">
          <div class="section-title">Notes</div>
          <div class="notes-content">{{notes}}</div>
        </div>
        {{/notes}}

        <!-- Payment Instructions -->
        {{#payment_instructions}}
        <div class="payment-section">
          <div class="section-title">Payment Instructions</div>
          <div>{{payment_instructions}}</div>
        </div>
        {{/payment_instructions}}

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This invoice was generated on {{generated_date}}</p>
        </div>
      </body>
    </html>
  `;

  // Format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  // Calculate total hours
  const totalHours = (invoice.line_items || []).reduce((sum: number, item: any) => sum + (item.hours || 0), 0);

  // Determine billing period
  const lineItems = invoice.line_items || [];
  let billingPeriod = "N/A";
  if (lineItems.length > 0) {
    const dates = lineItems
      .map((item: any) => item.time_entry?.entry_date)
      .filter(Boolean)
      .sort();

    if (dates.length > 0) {
      const startDate = new Date(dates[0]).toLocaleDateString();
      const endDate = new Date(dates[dates.length - 1]).toLocaleDateString();
      billingPeriod = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
    }
  }

  // Format line items for template
  const formattedLineItems = lineItems.map((item: any) => ({
    description: item.description || item.time_entry?.description || "Time entry",
    entry_date: item.time_entry?.entry_date ? formatDate(item.time_entry.entry_date) : "",
    hours: item.hours?.toFixed(1) || "0.0",
    rate: formatCurrency(item.rate || 0),
    amount: formatCurrency(item.amount || 0),
    ticket_title: item.time_entry?.ticket?.title || null
  }));

  // Mustache escapes HTML entities by default, which helps prevent XSS when
  // rendering user-provided content into the template.
  const html = Mustache.render(template, {
    // Company info (can be made configurable later)
    company_name: profile.tenant?.name || "Your Company",
    company_email: "",
    company_phone: "",

    // Invoice details
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    issue_date: formatDate(invoice.created_at),
    due_date: invoice.due_date ? formatDate(invoice.due_date) : null,
    generated_date: new Date().toLocaleDateString(),

    // Client information
    client_name: invoice.client?.name || "Unknown Client",
    client_company: invoice.client?.company || null,
    client_email: invoice.client?.email || null,

    // Invoice summary
    total_hours: totalHours.toFixed(1),
    billing_period: billingPeriod,

    // Line items
    line_items: formattedLineItems,

    // Financial totals
    subtotal: formatCurrency(invoice.subtotal || 0),
    tax_rate: invoice.tax_rate > 0 ? invoice.tax_rate.toFixed(1) : null,
    tax_amount: formatCurrency(invoice.tax_amount || 0),
    total_amount: formatCurrency(invoice.total_amount || 0),

    // Additional info
    notes: invoice.notes || null,
    payment_instructions: invoice.payment_instructions || null,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}