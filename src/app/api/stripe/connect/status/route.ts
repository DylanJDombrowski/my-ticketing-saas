import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with Stripe account ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_account_status, stripe_onboarding_completed")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        status: "not_connected",
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Update profile if status changed
    if (isComplete !== profile.stripe_onboarding_completed) {
      await supabase
        .from("profiles")
        .update({
          stripe_onboarding_completed: isComplete,
          stripe_account_status: isComplete ? "active" : "pending",
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      status: isComplete ? "active" : "pending",
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
