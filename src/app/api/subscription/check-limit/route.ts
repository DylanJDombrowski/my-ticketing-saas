import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    // Get tenant subscription info
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("invoice_count, invoice_limit, subscription_status")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        { error: "Failed to fetch subscription info" },
        { status: 500 }
      );
    }

    const current = tenant.invoice_count || 0;
    const limit = tenant.invoice_limit || 2;
    const remaining = Math.max(0, limit - current);
    const allowed = current < limit;
    const isUpgradeRequired =
      !allowed && tenant.subscription_status === "free";

    return NextResponse.json({
      allowed,
      limit,
      current,
      remaining,
      isUpgradeRequired,
      subscriptionStatus: tenant.subscription_status || "free",
    });
  } catch (error) {
    console.error("Check limit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
