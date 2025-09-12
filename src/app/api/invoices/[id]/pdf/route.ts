import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createServerClient } from "@/lib/supabase-server";
import type { PaymentMethod } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(
        `*, client:clients(*), line_items:invoice_line_items(*, time_entry:time_entries(*))`
      )
      .eq("id", params.id)
      .eq("tenant_id", profile?.tenant_id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: paymentMethods } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("tenant_id", profile?.tenant_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const lineItemsHtml = (invoice.line_items || [])
      .map(
        (item) =>
          `<tr><td>${item.description || ""}</td><td>${item.hours}</td><td>${item.rate.toFixed(
            2
          )}</td><td>${item.amount.toFixed(2)}</td></tr>`
      )
      .join("");

    const paymentHtml = (paymentMethods as PaymentMethod[] | null)?.
      map(
        (pm) =>
          `<li><strong>${pm.display_name}:</strong> ${
            pm.instructions || ""
          }</li>`
      )
      .join("") || "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      body { font-family: sans-serif; }
      table { width:100%; border-collapse: collapse; margin-top:20px; }
      th,td { border:1px solid #ddd; padding:8px; text-align:left; }
      th { background:#f3f3f3; }
    </style></head><body>
    <h1>Invoice ${invoice.invoice_number}</h1>
    <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
    <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : ""}</p>
    <h2>Bill To</h2>
    <p>${invoice.client?.name || ""}</p>
    <table><thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lineItemsHtml}</tbody></table>
    <h3>Subtotal: ${invoice.subtotal.toFixed(2)}</h3>
    <h3>Tax (${invoice.tax_rate}%): ${invoice.tax_amount.toFixed(2)}</h3>
    <h2>Total: ${invoice.total_amount.toFixed(2)}</h2>
    <h3>Payment Methods</h3><ul>${paymentHtml}</ul>
    ${invoice.notes ? `<p>${invoice.notes}</p>` : ""}
    </body></html>`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
