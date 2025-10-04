import { NextResponse, NextRequest } from "next/server";
export const dynamic = 'force-dynamic';
import { createServerClient } from "@/lib/supabase-server";

export interface NotificationRequest {
  recipient_email: string;
  notification_type: 'invoice_sent' | 'invoice_overdue' | 'ticket_comment' | 'ticket_status_change' | 'sla_alert';
  subject: string;
  message_body: string;
  related_id?: string; // invoice_id, ticket_id, etc.
  send_immediately?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json() as NotificationRequest;

    const {
      recipient_email,
      notification_type,
      subject,
      message_body,
      related_id,
      send_immediately = false
    } = body;

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

    const tenantId = profile.tenant_id;

    // Validate recipient email exists for this tenant
    const emailValidation = await validateRecipientEmail(supabase, tenantId, recipient_email);
    if (!emailValidation.valid) {
      return NextResponse.json({
        error: emailValidation.error || "Invalid recipient email"
      }, { status: 400 });
    }

    // Create notification log entry
    const { data: notification, error: notificationError } = await supabase
      .from("notification_log")
      .insert({
        tenant_id: tenantId,
        recipient_email,
        notification_type,
        subject,
        message_body,
        status: send_immediately ? "processing" : "pending",
        related_id
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification log:", notificationError);
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }

    // If sending immediately, attempt to send the email
    if (send_immediately) {
      try {
        const emailResult = await sendEmail({
          to: recipient_email,
          subject,
          body: message_body,
          notification_id: notification.id
        });

        if (emailResult.success) {
          await supabase
            .from("notification_log")
            .update({
              status: "sent",
              sent_at: new Date().toISOString()
            })
            .eq("id", notification.id);
        } else {
          await supabase
            .from("notification_log")
            .update({
              status: "failed",
              error_message: emailResult.error
            })
            .eq("id", notification.id);
        }
      } catch (error) {
        console.error("Error sending email:", error);
        await supabase
          .from("notification_log")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown email error"
          })
          .eq("id", notification.id);
      }
    }

    return NextResponse.json({
      message: send_immediately ? "Email sent successfully" : "Notification queued for sending",
      notification_id: notification.id,
      status: notification.status
    });

  } catch (error) {
    console.error("Notification send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to validate recipient email belongs to tenant
async function validateRecipientEmail(supabase: any, tenantId: string, email: string) {
  // Check if email belongs to a client in this tenant
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .eq("tenant_id", tenantId)
    .single();

  if (client) {
    return { valid: true };
  }

  // Check if email belongs to a user in this tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .eq("tenant_id", tenantId)
    .single();

  if (profile) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Email address does not belong to any client or user in your organization"
  };
}

// Email sending function - using a simple implementation for now
// In production, this would integrate with a service like Resend, SendGrid, etc.
async function sendEmail({ to, subject, body, notification_id }: {
  to: string;
  subject: string;
  body: string;
  notification_id: string;
}) {
  // For now, we'll just log the email content
  // In production, replace this with actual email service integration
  console.log("=== MOCK EMAIL SEND ===");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log(`Notification ID: ${notification_id}`);
  console.log("======================");

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // For demo purposes, randomly succeed/fail
  const success = Math.random() > 0.1; // 90% success rate

  if (success) {
    return { success: true };
  } else {
    return { success: false, error: "Mock email service failure" };
  }
}

// GET endpoint to retrieve notification logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
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
      .from("notification_log")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (type) {
      query = query.eq("notification_type", type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error("Notification fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}