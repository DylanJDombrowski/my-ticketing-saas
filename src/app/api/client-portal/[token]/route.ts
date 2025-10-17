import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { createClient } from "@supabase/supabase-js";

// Use service role for anonymous portal access
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
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

    if (accessError || !portalAccess) {
      return NextResponse.json({
        error: "Invalid or expired access token"
      }, { status: 401 });
    }

    if (portalAccess.expires_at && new Date(portalAccess.expires_at) < new Date()) {
      return NextResponse.json({ error: "Access token has expired" }, { status: 401 });
    }

    // Update last accessed timestamp
    await supabaseServiceRole
      .from("client_portal_access")
      .update({ last_accessed: new Date().toISOString() })
      .eq("id", portalAccess.id);

    // Fetch invoices for this client
    const { data: invoices } = await supabaseServiceRole
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

    return NextResponse.json({
      client: portalAccess.client,
      invoices: invoices || [],
      portal_info: {
        token,
        expires_at: portalAccess.expires_at,
        last_accessed: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Client portal access error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// This POST method is not used - portal access is created via /api/client-portal/generate
// Kept for backwards compatibility
