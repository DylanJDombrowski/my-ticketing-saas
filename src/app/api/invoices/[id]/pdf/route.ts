import Mustache from "mustache";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(name)"
    )
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const template = `
    <html>
      <head><title>Invoice {{invoice_number}}</title></head>
      <body>
        <h1>Invoice {{invoice_number}}</h1>
        <p>Client: {{client_name}}</p>
        {{#notes}}<p>Notes: {{notes}}</p>{{/notes}}
        {{#payment_instructions}}<p>Payment instructions: {{payment_instructions}}</p>{{/payment_instructions}}
      </body>
    </html>
  `;

  // Mustache escapes HTML entities by default, which helps prevent XSS when
  // rendering user-provided content into the template.
  const html = Mustache.render(template, {
    invoice_number: invoice.invoice_number,
    client_name: invoice.client?.name ?? "",
    notes: invoice.notes ?? "",
    payment_instructions: invoice.payment_instructions ?? "",
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}