import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

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
        created_at,
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

    // Generate client portal access token
    const accessToken = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

    // Create or update client portal access
    const { error: portalError } = await supabase
      .from("client_portal_access")
      .upsert({
        client_id: client.id,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        is_active: true
      }, {
        onConflict: 'client_id'
      });

    if (portalError) {
      console.error("Error creating portal access:", portalError);
      // Don't fail the email send if portal creation fails
    }

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const pdfUrl = `${baseUrl}/api/invoices/${invoice.id}/pdf`;
    const portalUrl = `${baseUrl}/client-portal/${accessToken}`;
    const paymentUrl = `${baseUrl}/client-portal/${accessToken}?invoice=${invoice.id}`;

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
                margin: 10px 8px;
              }
              .button:hover {
                background: #5568d3;
              }
              .button-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .button-primary:hover {
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
              }
              .button-secondary {
                background: #ffffff;
                color: #667eea;
                border: 2px solid #667eea;
              }
              .button-secondary:hover {
                background: #f8f9fa;
              }
              .buttons-container {
                text-align: center;
                margin: 30px 0;
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
                    <td>${new Date(invoice.created_at).toLocaleDateString()}</td>
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

              <div class="buttons-container">
                <a href="${paymentUrl}" class="button button-primary">💳 Pay This Invoice</a>
                <a href="${portalUrl}" class="button button-secondary">📊 View Client Portal</a>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${pdfUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">
                  📄 Download PDF
                </a>
              </div>

              <div style="background: #f0f4ff; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #4a5568;">
                  <strong>📱 Your Client Portal</strong><br/>
                  Access your secure portal to view all invoices, track project progress, and manage payments in one place.
                </p>
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
      portalUrl,
    });
  } catch (error) {
    console.error("Send invoice email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate secure random token for client portal access
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}
