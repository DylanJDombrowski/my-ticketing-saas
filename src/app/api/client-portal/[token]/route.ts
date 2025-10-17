import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { createClient } from "@supabase/supabase-js";

// Validate environment variables at startup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔧 Client Portal API - Environment Check:");
console.log("  SUPABASE_URL:", SUPABASE_URL ? "✅ Set" : "❌ Missing");
console.log("  SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_KEY ? "✅ Set" : "❌ Missing");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ CRITICAL: Missing required environment variables for client portal");
}

// Use service role for anonymous portal access
const supabaseServiceRole = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  console.log("🔍 Client Portal Access Request:");
  console.log("  Token:", token ? `${token.substring(0, 8)}...` : "❌ No token");
  console.log("  Service Role Client:", supabaseServiceRole ? "✅ Initialized" : "❌ Not initialized");

  // Check if service role client is available
  if (!supabaseServiceRole) {
    console.error("❌ Service role client not initialized - check environment variables");
    return NextResponse.json({
      error: "Server configuration error",
      debug: process.env.NODE_ENV === "development" ? "SUPABASE_SERVICE_ROLE_KEY not configured" : undefined
    }, { status: 500 });
  }

  try {
    console.log("📊 Querying client_portal_access table...");

    // Use service role client to bypass RLS for anonymous access
    const { data: portalAccess, error: accessError } = await supabaseServiceRole
      .from("client_portal_access")
      .select(`
        id,
        client_id,
        expires_at,
        is_active,
        client:clients(
          id,
          name,
          email,
          company,
          phone,
          address,
          tenant_id,
          tenant:tenants(
            id,
            name,
            email,
            company_name
          )
        )
      `)
      .eq("access_token", token)
      .eq("is_active", true)
      .single();

    console.log("📊 Database Query Result:");
    console.log("  Error:", accessError ? accessError.message : "None");
    console.log("  Data Found:", portalAccess ? "✅ Yes" : "❌ No");

    if (accessError) {
      console.error("❌ Database error:", accessError);
    }

    if (accessError || !portalAccess) {
      console.warn("⚠️ Access denied - invalid or inactive token");
      return NextResponse.json({
        error: "Invalid or expired access token",
        debug: process.env.NODE_ENV === "development" ? {
          dbError: accessError?.message,
          tokenProvided: !!token,
          queryExecuted: true
        } : undefined
      }, { status: 401 });
    }

    if (portalAccess.expires_at && new Date(portalAccess.expires_at) < new Date()) {
      console.warn("⚠️ Token expired:", portalAccess.expires_at);
      return NextResponse.json({
        error: "Access token has expired",
        debug: process.env.NODE_ENV === "development" ? {
          expiresAt: portalAccess.expires_at,
          now: new Date().toISOString()
        } : undefined
      }, { status: 401 });
    }

    console.log("✅ Access granted for client:", portalAccess.client_id);

    // Update last accessed timestamp
    console.log("📝 Updating last_accessed timestamp...");
    await supabaseServiceRole
      .from("client_portal_access")
      .update({ last_accessed: new Date().toISOString() })
      .eq("id", portalAccess.id);

    // Fetch invoices for this client
    console.log("📄 Fetching invoices for client...");
    const { data: invoices, error: invoicesError } = await supabaseServiceRole
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        total_amount,
        due_date,
        created_at,
        payment_instructions,
        notes
      `)
      .eq("client_id", portalAccess.client_id)
      .order("created_at", { ascending: false });

    console.log("📄 Invoices Query Result:");
    console.log("  Error:", invoicesError ? invoicesError.message : "None");
    console.log("  Count:", invoices?.length || 0);

    const response = {
      client: portalAccess.client,
      invoices: invoices || [],
      portal_info: {
        token,
        expires_at: portalAccess.expires_at,
        last_accessed: new Date().toISOString()
      }
    };

    console.log("✅ Returning successful response");
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Client portal access error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Internal server error",
      debug: process.env.NODE_ENV === "development" ? {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    }, { status: 500 });
  }
}

// This POST method is not used - portal access is created via /api/client-portal/generate
// Kept for backwards compatibility
