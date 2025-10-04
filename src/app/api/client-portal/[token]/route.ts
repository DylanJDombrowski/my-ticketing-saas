import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createServerClient();
    const { token } = params;

    // Validate token and get client info
    const { data: portalAccess, error: accessError } = await supabase
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
      return NextResponse.json(
        { error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (portalAccess.expires_at && new Date(portalAccess.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Access token has expired" },
        { status: 401 }
      );
    }

    // Update last accessed timestamp
    await supabase
      .from("client_portal_access")
      .update({ last_accessed: new Date().toISOString() })
      .eq("id", portalAccess.id);

    // Get client's invoices
    const { data: invoices, error: invoicesError } = await supabase
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

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Get client's tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        created_at,
        updated_at
      `)
      .eq("client_id", portalAccess.client_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      client: portalAccess.client,
      invoices: invoices || [],
      tickets: tickets || [],
      portal_info: {
        token,
        expires_at: portalAccess.expires_at,
        last_accessed: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Client portal access error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();
    const { client_id, expires_in_days = 30 } = body;

    // Validate admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Validate client belongs to user's tenant
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Call the database function to create portal access
    const { data: tokenResult, error: tokenError } = await supabase
      .rpc("create_client_portal_access", {
        p_client_id: client_id,
        p_expires_in_days: expires_in_days
      });

    if (tokenError) {
      console.error("Error creating portal access:", tokenError);
      return NextResponse.json(
        { error: "Failed to create portal access" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Client portal access created successfully",
      access_token: tokenResult,
      portal_url: `/client-portal/${tokenResult}`,
      expires_in_days
    });

  } catch (error) {
    console.error("Client portal creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
