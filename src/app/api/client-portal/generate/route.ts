import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { client_id, expires_in_days = 30 } = await request.json();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify client belongs to user's tenant
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
    }

    // Check if RPC function exists, if not create access manually
    try {
      const { data: tokenResult, error: tokenError } = await supabase.rpc(
        "create_client_portal_access",
        { p_client_id: client_id, p_expires_in_days: expires_in_days }
      );

      if (tokenError) {
        throw tokenError;
      }

      return NextResponse.json({
        message: "Client portal access created successfully",
        access_token: tokenResult,
        portal_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/client-portal/${tokenResult}`,
        expires_in_days
      });
    } catch {
      // RPC function doesn't exist, create manually
      const accessToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);

      const { data: portalAccess, error: insertError } = await supabase
        .from("client_portal_access")
        .insert({
          client_id,
          access_token: accessToken,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select("access_token")
        .single();

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        message: "Client portal access created successfully",
        access_token: portalAccess.access_token,
        portal_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/client-portal/${portalAccess.access_token}`,
        expires_in_days
      });
    }
  } catch (error: any) {
    console.error("Client portal creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate secure random token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}
