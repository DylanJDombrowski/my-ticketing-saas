import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Create admin Supabase client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  const tenantId = session.metadata?.tenant_id;

  if (!invoiceId || !tenantId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payments')
    .update({
      status: 'processing',
      payment_method: session.payment_method_types?.[0] || 'card',
    })
    .eq('invoice_id', invoiceId)
    .eq('stripe_payment_intent_id', session.payment_intent as string);

  console.log(`Checkout completed for invoice ${invoiceId}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, invoice_id, tenant_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update payment status
  await supabaseAdmin
    .from('payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  // Update invoice status to paid
  await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.invoice_id);

  // Get invoice details for notification
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select(`
      invoice_number,
      total_amount,
      client:clients (
        name,
        email
      )
    `)
    .eq('id', payment.invoice_id)
    .single();

  // Create notification log
  if (invoice) {
    const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
    if (client?.email) {
      await supabaseAdmin.from('notification_log').insert({
        tenant_id: payment.tenant_id,
        recipient_email: client.email,
        notification_type: 'payment_received',
        subject: `Payment Received - Invoice ${invoice.invoice_number}`,
        message_body: `Payment of $${invoice.total_amount} has been received for invoice ${invoice.invoice_number}. Thank you!`,
        status: 'pending',
      });
    }
  }

  console.log(`Payment succeeded for invoice ${payment.invoice_id}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, invoice_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update payment status
  await supabaseAdmin
    .from('payments')
    .update({
      status: 'failed',
    })
    .eq('id', payment.id);

  console.log(`Payment failed for invoice ${payment.invoice_id}`);
}
