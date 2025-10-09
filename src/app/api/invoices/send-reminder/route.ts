import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Fetch invoice with client details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        client:clients(id, name, email),
        tenant:tenants(id, name)
      `
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if invoice is in a remindable state
    if (invoice.status !== "sent" && invoice.status !== "overdue") {
      return NextResponse.json(
        { error: "Can only send reminders for sent or overdue invoices" },
        { status: 400 }
      );
    }

    const client = Array.isArray(invoice.client)
      ? invoice.client[0]
      : invoice.client;
    const tenant = Array.isArray(invoice.tenant)
      ? invoice.tenant[0]
      : invoice.tenant;

    if (!client?.email) {
      return NextResponse.json(
        { error: "Client email not found" },
        { status: 400 }
      );
    }

    // Generate payment link (client portal)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentLink = `${appUrl}/client-portal/${invoice.id}`;

    // Format amount
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(invoice.total_amount);

    // Send reminder email
    const { error: emailError } = await resend.emails.send({
      from: `${tenant?.name || "Billable"} <noreply@trybillable.com>`,
      to: client.email,
      subject: `Friendly reminder: Invoice ${invoice.invoice_number}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
            </div>

            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${client.name},</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Just a quick reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>${formattedAmount}</strong> is still pending.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentLink}"
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          padding: 14px 32px;
                          text-decoration: none;
                          border-radius: 6px;
                          font-weight: 600;
                          display: inline-block;
                          font-size: 16px;">
                  Pay This Invoice
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you've already sent payment, please disregard this message!
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                Thanks,<br>
                ${tenant?.name || "Your Team"}
              </p>

              <p style="font-size: 12px; color: #999; margin-top: 30px;">
                This is an automated reminder from ${tenant?.name || "Billable"}.
                You received this because you have an outstanding invoice.
              </p>
            </div>

          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return NextResponse.json(
        { error: "Failed to send reminder email" },
        { status: 500 }
      );
    }

    // Update invoice with reminder tracking
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (invoice.reminder_count || 0) + 1,
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Failed to update invoice:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Reminder sent successfully",
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
