import { createServerClient } from "@/lib/supabase-server";

export interface SubscriptionCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  isUpgradeRequired: boolean;
  subscriptionStatus: string;
}

/**
 * Check if tenant can create more invoices based on their subscription
 */
export async function checkInvoiceLimit(
  tenantId: string
): Promise<SubscriptionCheckResult> {
  const supabase = await createServerClient();

  // Get tenant subscription info
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("invoice_count, invoice_limit, subscription_status")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) {
    throw new Error("Failed to fetch tenant subscription info");
  }

  const current = tenant.invoice_count || 0;
  const limit = tenant.invoice_limit || 2;
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;
  const isUpgradeRequired = !allowed && tenant.subscription_status === "free";

  return {
    allowed,
    limit,
    current,
    remaining,
    isUpgradeRequired,
    subscriptionStatus: tenant.subscription_status || "free",
  };
}

/**
 * Increment tenant invoice count (call this when creating an invoice)
 */
export async function incrementInvoiceCount(tenantId: string): Promise<void> {
  const supabase = await createServerClient();

  // Use service role for this operation to bypass RLS
  await supabase.rpc("increment_invoice_count", { tenant_id: tenantId });
}

/**
 * Check if tenant has an active subscription
 */
export async function hasActiveSubscription(tenantId: string): Promise<boolean> {
  const supabase = await createServerClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_status")
    .eq("id", tenantId)
    .single();

  return tenant?.subscription_status === "active" || tenant?.subscription_status === "trialing";
}
