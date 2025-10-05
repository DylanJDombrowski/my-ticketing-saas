import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
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

  // Check if Stripe Connect webhook secret is configured
  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error('STRIPE_CONNECT_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case 'capability.updated': {
        const capability = event.data.object as Stripe.Capability;
        await handleCapabilityUpdated(capability);
        break;
      }

      case 'account.application.deauthorized': {
        const account = event.data.object as Stripe.Account;
        await handleAccountDeauthorized(account);
        break;
      }

      default:
        console.log(`Unhandled Connect event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Connect webhook handler error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const isComplete =
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled;

  const status = isComplete ? 'active' : 'pending';

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_onboarding_completed: isComplete,
      stripe_account_status: status,
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error(`Error updating account ${account.id}:`, error);
  } else {
    console.log(`Account ${account.id} updated to status: ${status}`);
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  // Get the account this capability belongs to
  const accountId = typeof capability.account === 'string'
    ? capability.account
    : capability.account.id;

  console.log(`Capability ${capability.id} updated for account ${accountId}: ${capability.status}`);

  // If charges or transfers capability becomes active, update profile
  if (
    (capability.id === 'card_payments' || capability.id === 'transfers') &&
    capability.status === 'active'
  ) {
    // Fetch full account to check if both capabilities are active
    const account = await stripe.accounts.retrieve(accountId);
    await handleAccountUpdated(account);
  }
}

async function handleAccountDeauthorized(account: Stripe.Account) {
  // User disconnected their Stripe account
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_account_id: null,
      stripe_onboarding_completed: false,
      stripe_account_status: null,
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error(`Error deauthorizing account ${account.id}:`, error);
  } else {
    console.log(`Account ${account.id} deauthorized and disconnected`);
  }
}
