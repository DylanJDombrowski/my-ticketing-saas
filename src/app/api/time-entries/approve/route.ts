import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

interface BulkApprovalRequest {
  time_entry_ids: string[];
  approval_status: 'approved' | 'rejected';
  rejection_reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json() as BulkApprovalRequest;

    const {
      time_entry_ids,
      approval_status,
      rejection_reason
    } = body;

    if (!time_entry_ids || time_entry_ids.length === 0) {
      return NextResponse.json({ error: "No time entries specified" }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(approval_status)) {
      return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
    }

    if (approval_status === 'rejected' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

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

    // Verify all time entries belong to user's tenant
    const { data: timeEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select("id, user_id, description, hours, entry_date, approval_status")
      .in("id", time_entry_ids)
      .eq("tenant_id", profile.tenant_id);

    if (entriesError || !timeEntries) {
      console.error("Error fetching time entries:", entriesError);
      return NextResponse.json({ error: "Failed to verify time entries" }, { status: 500 });
    }

    if (timeEntries.length !== time_entry_ids.length) {
      return NextResponse.json({ error: "Some time entries not found or access denied" }, { status: 404 });
    }

    // Check if any entries are already processed
    const alreadyProcessed = timeEntries.filter(entry => entry.approval_status !== 'submitted');
    if (alreadyProcessed.length > 0) {
      return NextResponse.json({
        error: `${alreadyProcessed.length} time entries have already been processed`,
        processed_entries: alreadyProcessed.map(e => e.id)
      }, { status: 400 });
    }

    // Update time entries
    const updateData: any = {
      approval_status,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    };

    if (approval_status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { error: updateError } = await supabase
      .from("time_entries")
      .update(updateData)
      .in("id", time_entry_ids);

    if (updateError) {
      console.error("Error updating time entries:", updateError);
      return NextResponse.json({ error: "Failed to update time entries" }, { status: 500 });
    }

    // Send notifications to users about the approval/rejection
    for (const entry of timeEntries) {
      try {
        // Get user's email
        const { data: entryUser } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", entry.user_id)
          .single();

        if (entryUser?.email) {
          const subject = approval_status === 'approved'
            ? `Time Entry Approved: ${entry.description}`
            : `Time Entry Rejected: ${entry.description}`;

          const message = approval_status === 'approved'
            ? `Your time entry for ${entry.hours} hours on ${entry.entry_date} has been approved and is ready for billing.`
            : `Your time entry for ${entry.hours} hours on ${entry.entry_date} has been rejected. Reason: ${rejection_reason}`;

          await supabase
            .from("notification_log")
            .insert({
              tenant_id: profile.tenant_id,
              recipient_email: entryUser.email,
              notification_type: "time_entry_approval",
              subject,
              message_body: message,
              status: "pending",
              related_id: entry.id
            });
        }
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the approval process if notifications fail
      }
    }

    const actionWord = approval_status === 'approved' ? 'approved' : 'rejected';
    return NextResponse.json({
      message: `Successfully ${actionWord} ${time_entry_ids.length} time entries`,
      processed_count: time_entry_ids.length,
      approval_status,
      ...(rejection_reason && { rejection_reason })
    });

  } catch (error) {
    console.error("Time entry approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}