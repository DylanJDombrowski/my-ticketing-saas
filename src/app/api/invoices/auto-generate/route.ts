import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { TimeEntry, AutoInvoiceGenerationForm, InvoiceLineItem } from "@/lib/types";

interface TimeEntryWithRates extends TimeEntry {
  ticket?: {
    client?: {
      id: string;
      name: string;
      email: string;
      hourly_rate: number | null;
    }
  };
  user?: {
    id: string;
    default_hourly_rate: number | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json() as AutoInvoiceGenerationForm;

    const {
      client_id,
      date_range_start,
      date_range_end,
      include_non_billable,
      auto_approve,
      send_notification
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

    // Fetch unbilled time entries for the client within date range
    let query = supabase
      .from("time_entries")
      .select(`
        id, description, hours, is_billable, entry_date, ticket_id, user_id,
        ticket:tickets(
          client:clients(id, name, email, hourly_rate)
        ),
        user:profiles(id, default_hourly_rate)
      `)
      .eq("tenant_id", tenantId)
      .gte("entry_date", date_range_start)
      .lte("entry_date", date_range_end)
      .is("invoice_id", null) // Only unbilled entries
      .eq("approval_status", "approved"); // Only approved entries

    if (client_id) {
      // Filter by specific client through tickets
      const { data: clientTickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("client_id", client_id)
        .eq("tenant_id", tenantId);

      if (clientTickets) {
        const ticketIds = clientTickets.map(t => t.id);
        query = query.in("ticket_id", ticketIds);
      }
    }

    if (!include_non_billable) {
      query = query.eq("is_billable", true);
    }

    const { data: timeEntries, error: entriesError } = await query;

    if (entriesError) {
      console.error("Error fetching time entries:", entriesError);
      return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
    }

    if (!timeEntries || timeEntries.length === 0) {
      return NextResponse.json({
        message: "No unbilled time entries found for the specified criteria",
        invoices: []
      });
    }

    // Group time entries by client
    const entriesByClient = timeEntries.reduce((acc, entry: TimeEntryWithRates) => {
      const clientId = entry.ticket?.client?.id;
      if (!clientId) return acc;

      if (!acc[clientId]) {
        acc[clientId] = {
          client: entry.ticket.client,
          entries: []
        };
      }
      acc[clientId].entries.push(entry);
      return acc;
    }, {} as Record<string, { client: any; entries: TimeEntryWithRates[] }>);

    const createdInvoices = [];

    // Generate invoice for each client
    for (const [clientId, { client, entries }] of Object.entries(entriesByClient)) {
      try {
        // Calculate line items
        const lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at'>[] = entries.map((entry) => {
          const rate = entry.ticket?.client?.hourly_rate ?? entry.user?.default_hourly_rate ?? 75;
          const amount = rate * entry.hours;
          return {
            time_entry_id: entry.id,
            description: entry.description || `Work on ticket`,
            hours: entry.hours,
            rate,
            amount,
            time_entry: undefined,
          };
        });

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = 0; // Default no tax, can be configured later
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        // Generate invoice number
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const { data: lastInvoices } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("tenant_id", tenantId)
          .like("invoice_number", `${prefix}%`)
          .order("invoice_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastInvoices && lastInvoices.length > 0) {
          const last = lastInvoices[0].invoice_number.split("-").pop();
          nextNumber = (parseInt(last || "0", 10) || 0) + 1;
        }
        const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

        // Calculate due date (30 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            tenant_id: tenantId,
            client_id: clientId,
            invoice_number: invoiceNumber,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: auto_approve ? 'sent' : 'draft',
            approval_status: auto_approve ? 'approved' : 'draft',
            approved_by: auto_approve ? user.id : null,
            approved_at: auto_approve ? new Date().toISOString() : null,
            due_date: dueDate.toISOString().split('T')[0],
            payment_instructions: "Payment is due within 30 days of invoice date.",
            notes: `Auto-generated invoice for time period: ${date_range_start} to ${date_range_end}`,
            created_by: user.id
          })
          .select()
          .single();

        if (invoiceError) {
          console.error("Error creating invoice:", invoiceError);
          continue;
        }

        // Create line items
        const itemsToInsert = lineItems.map((item) => ({
          invoice_id: invoice.id,
          time_entry_id: item.time_entry_id,
          description: item.description,
          hours: item.hours,
          rate: item.rate,
          amount: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_line_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Error creating line items:", itemsError);
          continue;
        }

        // Mark time entries as billed
        const { error: updateError } = await supabase
          .from("time_entries")
          .update({ invoice_id: invoice.id })
          .in("id", entries.map(e => e.id));

        if (updateError) {
          console.error("Error updating time entries:", updateError);
        }

        // Log notification if requested
        if (send_notification) {
          await supabase
            .from("notification_log")
            .insert({
              tenant_id: tenantId,
              recipient_email: client.email,
              notification_type: "invoice_sent",
              subject: `New Invoice ${invoiceNumber}`,
              message_body: `Your invoice ${invoiceNumber} for $${totalAmount.toFixed(2)} is ready for payment.`,
              status: "pending"
            });
        }

        createdInvoices.push({
          ...invoice,
          client,
          line_items: itemsToInsert,
          time_entries_count: entries.length
        });

      } catch (error) {
        console.error(`Error creating invoice for client ${clientId}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      message: `Successfully generated ${createdInvoices.length} invoice(s)`,
      invoices: createdInvoices,
      summary: {
        total_invoices: createdInvoices.length,
        total_amount: createdInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        clients_billed: Object.keys(entriesByClient).length
      }
    });

  } catch (error) {
    console.error("Auto invoice generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}