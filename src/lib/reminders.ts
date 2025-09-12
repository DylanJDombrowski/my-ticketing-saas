import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();

export const queueInvoiceReminder = async (
  invoiceId: string,
  sendAt: string
): Promise<{ error?: string }> => {
  try {
    const { error } = await supabase.functions.invoke("queue-invoice-reminder", {
      body: { invoiceId, sendAt },
    });
    if (error) throw error;
    return {};
  } catch (error: unknown) {
    console.error("Error queueing invoice reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to queue reminder";
    return { error: message };
  }
};
