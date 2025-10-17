import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint to diagnose subscription and portal issues
 * Visit: http://localhost:3000/api/debug/health-check
 * or: https://trybillable.com/api/debug/health-check
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    issues: [],
    fixes: [],
  };

  try {
    const supabase = await createServerClient();

    // Check 1: Verify Stripe columns exist
    results.checks.stripeColumns = await checkStripeColumns(supabase);

    // Check 2: Check tenant data
    results.checks.tenantData = await checkTenantData(supabase);

    // Check 3: Check portal access tokens
    results.checks.portalTokens = await checkPortalTokens(supabase);

    // Check 4: Check RLS policies
    results.checks.rlsPolicies = await checkRLSPolicies(supabase);

    // Check 5: Verify trigger exists
    results.checks.trigger = await checkTrigger(supabase);

    // Analyze issues
    analyzeIssues(results);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    results.error = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(results, { status: 500 });
  }
}

async function checkStripeColumns(supabase: any) {
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tenants'
          AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'invoice_count', 'invoice_limit')
      `
    })
    .catch(() => {
      // Fallback: try direct query
      return supabase
        .from('tenants')
        .select('stripe_customer_id, subscription_status, invoice_count, invoice_limit')
        .limit(1);
    });

  const hasColumns = !error && data;

  return {
    status: hasColumns ? "✅ PASS" : "❌ FAIL",
    message: hasColumns
      ? "Stripe columns exist on tenants table"
      : "Stripe columns NOT FOUND - migrations not run",
    fix: hasColumns ? null : "Run MANUAL_RUN_THIS_STRIPE_MIGRATION.sql",
  };
}

async function checkTenantData(supabase: any) {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, name, invoice_count, invoice_limit, subscription_status");

  if (error || !tenants) {
    return {
      status: "❌ FAIL",
      message: `Error fetching tenants: ${error?.message}`,
      fix: "Check database connection and RLS policies",
    };
  }

  // Count actual invoices
  const tenantsWithCounts = await Promise.all(
    tenants.map(async (tenant: any) => {
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);

      return {
        ...tenant,
        actual_invoice_count: count || 0,
        count_mismatch: (tenant.invoice_count || 0) !== (count || 0),
      };
    })
  );

  const hasMismatches = tenantsWithCounts.some((t: any) => t.count_mismatch);

  return {
    status: hasMismatches ? "⚠️ WARNING" : "✅ PASS",
    message: hasMismatches
      ? "Invoice counts don't match actual invoices"
      : "Invoice counts are accurate",
    data: tenantsWithCounts,
    fix: hasMismatches
      ? "Run: UPDATE tenants t SET invoice_count = (SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id)"
      : null,
  };
}

async function checkPortalTokens(supabase: any) {
  const { data: tokens, error } = await supabase
    .from("client_portal_access")
    .select("id, client_id, access_token, is_active, expires_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return {
      status: "❌ FAIL",
      message: `Error querying portal tokens: ${error.message}`,
      fix: "Check if client_portal_access table exists and RLS policies",
    };
  }

  const activeTokens = tokens?.filter((t: any) => t.is_active) || [];
  const expiredTokens = tokens?.filter(
    (t: any) => t.expires_at && new Date(t.expires_at) < new Date()
  ) || [];

  return {
    status: tokens && tokens.length > 0 ? "✅ PASS" : "⚠️ WARNING",
    message:
      tokens && tokens.length > 0
        ? `Found ${tokens.length} portal tokens (${activeTokens.length} active)`
        : "No portal access tokens found",
    data: {
      total: tokens?.length || 0,
      active: activeTokens.length,
      expired: expiredTokens.length,
      recent: tokens?.slice(0, 3),
    },
    fix:
      tokens && tokens.length > 0
        ? null
        : "Send an invoice email to create tokens. If still failing, check RLS policies.",
  };
}

async function checkRLSPolicies(supabase: any) {
  // This is a simplified check - actual policy inspection requires service role
  const { error: anonError } = await supabase
    .from("client_portal_access")
    .select("id")
    .limit(1);

  const canReadAsAnon = !anonError || anonError.message.includes("no rows");

  return {
    status: canReadAsAnon ? "✅ PASS" : "⚠️ WARNING",
    message: canReadAsAnon
      ? "RLS policies appear to be configured"
      : "RLS policies might be blocking access",
    note: "Full policy check requires service role access",
    fix: !canReadAsAnon
      ? "Check RLS policies on client_portal_access table"
      : null,
  };
}

async function checkTrigger(supabase: any) {
  // We can't directly query pg_trigger without service role
  // So we'll check if invoice_count increments work
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, invoice_count")
    .limit(1)
    .single();

  if (!tenants) {
    return {
      status: "⚠️ UNKNOWN",
      message: "Cannot verify trigger without tenant data",
    };
  }

  return {
    status: "ℹ️ INFO",
    message: "Trigger verification requires creating a test invoice",
    note: "Check if invoice_count increments after creating invoices",
    fix: "If invoice_count stays at 0, run MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql",
  };
}

function analyzeIssues(results: any) {
  const checks = results.checks;

  // Issue 1: No Stripe columns
  if (checks.stripeColumns?.status === "❌ FAIL") {
    results.issues.push({
      severity: "CRITICAL",
      issue: "Stripe subscription columns missing",
      impact: "Invoice limits cannot be enforced",
      fix: "Run MANUAL_RUN_THIS_STRIPE_MIGRATION.sql in Supabase SQL Editor",
    });
  }

  // Issue 2: Count mismatch
  if (checks.tenantData?.status === "⚠️ WARNING") {
    results.issues.push({
      severity: "HIGH",
      issue: "Invoice counts out of sync",
      impact: "Limits may not be enforced correctly",
      fix: "Run sync query from DEBUG_ISSUES.sql",
    });
  }

  // Issue 3: No portal tokens
  if (checks.portalTokens?.data?.total === 0) {
    results.issues.push({
      severity: "HIGH",
      issue: "No client portal tokens exist",
      impact: "Client portal links won't work",
      fix: "Check RLS policies and try sending an invoice email",
    });
  }

  // Generate overall status
  const criticalIssues = results.issues.filter(
    (i: any) => i.severity === "CRITICAL"
  );
  const highIssues = results.issues.filter((i: any) => i.severity === "HIGH");

  if (criticalIssues.length > 0) {
    results.overallStatus = "❌ CRITICAL ISSUES";
  } else if (highIssues.length > 0) {
    results.overallStatus = "⚠️ NEEDS ATTENTION";
  } else {
    results.overallStatus = "✅ HEALTHY";
  }
}
