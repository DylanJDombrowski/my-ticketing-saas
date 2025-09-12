import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { RecurrenceRule } from "@/lib/types";

const calculateNextRun = (rule: RecurrenceRule): string => {
  const date = new Date();
  switch (rule) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString();
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId, recurrence }: { invoiceId: string; recurrence: RecurrenceRule } =
      await request.json();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) throw profileError;

    const nextRunAt = calculateNextRun(recurrence);

    const { error } = await supabase
      .from("invoices")
      .update({ recurrence_rule: recurrence, next_run_at: nextRunAt })
      .eq("id", invoiceId)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error scheduling recurring invoice", error);
    return NextResponse.json(
      { error: "Failed to schedule recurring invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) throw profileError;

    const { error } = await supabase
      .from("invoices")
      .update({ recurrence_rule: null, next_run_at: null })
      .eq("id", invoiceId)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling recurring invoice", error);
    return NextResponse.json(
      { error: "Failed to cancel recurring invoice" },
      { status: 500 }
    );
  }
}
