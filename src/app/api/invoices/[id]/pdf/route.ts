import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServerClient } from "@/lib/supabase-server";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import type { Invoice, PaymentMethod } from "@/lib/types";

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

    const html = renderToString(
      React.createElement(InvoicePreview, {
        invoice: invoice as Invoice,
        paymentMethods: (paymentMethods as PaymentMethod[]) || [],
      })
    );

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
