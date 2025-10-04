import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID required" },
        { status: 400 }
      );
    }

    // Get invoice with client and user details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        total_amount,
        client:clients(id, name, email),
        created_by_user:profiles!invoices_created_by_fkey(
          id,
          stripe_account_id,
          stripe_onboarding_completed
        )
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

    // Check if user has connected Stripe account
    if (
      !invoice.created_by_user?.stripe_account_id ||
      !invoice.created_by_user?.stripe_onboarding_completed
    ) {
      return NextResponse.json(
        { error: "Stripe account not connected. Please complete onboarding first." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    // Create Checkout Session for Connected Account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: `Payment for invoice ${invoice.invoice_number}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/dashboard/invoices?payment=success&invoice=${invoice.id}`,
        cancel_url: `${baseUrl}/dashboard/invoices?payment=cancelled&invoice=${invoice.id}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
        payment_intent_data: {
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
          },
        },
      },
      {
        stripeAccount: invoice.created_by_user.stripe_account_id,
      }
    );

    // Save checkout session ID to invoice
    await supabase
      .from("invoices")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", invoiceId);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe payment creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
