import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile and tenant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id, tenant:tenants(id, name, email, stripe_customer_id)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tenant = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;

    // Get or create Stripe customer
    let customerId = tenant?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || tenant?.email,
        metadata: {
          tenant_id: profile.tenant_id,
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to tenant
      await supabase
        .from("tenants")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.tenant_id);
    }

    // Create Stripe checkout session for Pro plan ($6.99/month)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Billable Pro",
              description: "Unlimited invoices, clients, and time tracking",
            },
            unit_amount: 699, // $6.99 in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
      metadata: {
        tenant_id: profile.tenant_id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
