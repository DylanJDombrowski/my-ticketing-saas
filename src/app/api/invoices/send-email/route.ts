import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { invoiceId } = await request.json();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile and tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, first_name, last_name, tenant:tenants(id, name)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get invoice with client details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        total_amount,
        due_date,
        issue_date,
        status,
        client:clients(id, name, email)
      `
      )
      .eq("id", invoiceId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Handle client being returned as array
    const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;

    if (!client?.email) {
      return NextResponse.json(
        { error: "Client email not found" },
        { status: 400 }
      );
    }

    // Generate PDF URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const pdfUrl = `${baseUrl}/api/invoices/${invoice.id}/pdf`;

    // Format currency
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

    // Handle tenant being returned as array
    const tenant = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;

    // Send email via Resend
    const { data, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "invoices@yourdomain.com",
      to: [client.email],
      subject: `Invoice ${invoice.invoice_number} from ${tenant?.name || "Your Company"}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .invoice-details {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .invoice-details table {
                width: 100%;
                border-collapse: collapse;
              }
              .invoice-details td {
                padding: 8px 0;
              }
              .invoice-details td:first-child {
                color: #666;
                width: 40%;
              }
              .invoice-details td:last-child {
                font-weight: 600;
                text-align: right;
              }
              .amount {
                font-size: 32px;
                color: #667eea;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .button:hover {
                background: #5568d3;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
              .center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice ${invoice.invoice_number}</h1>
            </div>

            <div class="content">
              <p>Hi ${client.name},</p>

              <p>Thank you for your business! Please find your invoice details below.</p>

              <div class="invoice-details">
                <table>
                  <tr>
                    <td>Invoice Number:</td>
                    <td>#${invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td>Issue Date:</td>
                    <td>${new Date(invoice.issue_date).toLocaleDateString()}</td>
                  </tr>
                  ${
                    invoice.due_date
                      ? `
                  <tr>
                    <td>Due Date:</td>
                    <td>${new Date(invoice.due_date).toLocaleDateString()}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td>From:</td>
                    <td>${tenant?.name || "Your Company"}</td>
                  </tr>
                </table>
              </div>

              <div class="amount">
                ${formatCurrency(invoice.total_amount)}
              </div>

              <div class="center">
                <a href="${pdfUrl}" class="button">View Invoice PDF</a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                If you have any questions about this invoice, please don't hesitate to reach out.
              </p>
            </div>

            <div class="footer">
              <p>This is an automated email from ${tenant?.name || "Your Company"}.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email", details: emailError },
        { status: 500 }
      );
    }

    // Update invoice status to sent
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        sent_at: now,
        sent_to_email: client.email,
      })
      .eq("id", invoiceId)
      .eq("tenant_id", profile.tenant_id);

    if (updateError) {
      console.error("Error updating invoice status:", updateError);
      return NextResponse.json(
        { error: "Email sent but failed to update invoice status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      message: `Invoice sent to ${client.email}`,
    });
  } catch (error) {
    console.error("Send invoice email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
