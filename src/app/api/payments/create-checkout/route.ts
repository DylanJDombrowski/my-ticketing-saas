import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe, STRIPE_CONFIG } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch invoice with tenant check
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        status,
        tenant_id,
        client:clients (
          id,
          name,
          email
        )
      `)
      .eq('id', invoice_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Handle client being returned as array
    const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;

    // Don't allow payment for already paid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: STRIPE_CONFIG.paymentMethodTypes as any,
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.currency,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for invoice ${invoice.invoice_number}`,
            },
            unit_amount: formatAmountForStripe(invoice.total_amount),
          },
          quantity: 1,
        },
      ],
      customer_email: client?.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/payment-cancel?invoice_id=${invoice_id}`,
      metadata: {
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        invoice_number: invoice.invoice_number,
      },
    });

    // Create payment record
    await supabase.from('payments').insert({
      tenant_id: invoice.tenant_id,
      invoice_id: invoice.id,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: invoice.total_amount,
      currency: STRIPE_CONFIG.currency,
      status: 'pending',
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
