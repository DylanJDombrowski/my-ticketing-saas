import { NextResponse, NextRequest } from "next/server";
export const dynamic = 'force-dynamic';
import { createServerClient } from "@/lib/supabase-server";

// GET endpoint to fetch time entries for approval
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get user's tenant
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

    let query = supabase
      .from("time_entries")
      .select(`
        id,
        description,
        hours,
        is_billable,
        entry_date,
        approval_status,
        approved_by,
        approved_at,
        created_at,
        user:profiles!time_entries_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        ticket:tickets(
          id,
          title,
          client:clients(
            id,
            name,
            hourly_rate
          )
        )
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("approval_status", status);
    }

    const { data: timeEntries, error } = await query;

    if (error) {
      console.error("Error fetching time entries:", error);
      return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
    }

    return NextResponse.json({ time_entries: timeEntries });

  } catch (error) {
    console.error("Time entries approval fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}