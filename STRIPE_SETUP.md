# Stripe Payment Integration Setup Guide

This guide will walk you through setting up Stripe payments for TryBillable.com.

## Prerequisites

- ✅ Stripe account created (https://dashboard.stripe.com/register)
- ✅ Business bank account linked to Stripe
- ✅ Supabase project deployed
- ✅ Environment variables configured

---

## Step 1: Get Your Stripe API Keys

1. Log into your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers > API keys**
3. Copy the following keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

### Add to `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

---

## Step 2: Set Up Webhook Endpoint

Webhooks allow Stripe to notify your app when payments succeed or fail.

### Development (Using Stripe CLI)

1. **Install Stripe CLI:**

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Linux
   wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
   tar -xvf stripe_linux_x86_64.tar.gz
   sudo mv stripe /usr/local/bin
   ```

2. **Login to Stripe:**

   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost:**

   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`):
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production (Hosted App)

1. Go to **Stripe Dashboard > Developers > Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://trybillable.com/api/payments/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** and add to production environment variables

---

## Step 3: Get Supabase Service Role Key

The webhook needs admin access to update payment records (bypassing RLS).

1. Go to **Supabase Dashboard > Settings > API**
2. Copy the `service_role` key (⚠️ Keep this secret!)
3. Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

---

## Step 4: Run Database Migration

Apply the payments table migration:

```bash
# If using Supabase CLI (recommended)
supabase db push

# Or manually run the SQL in Supabase Dashboard > SQL Editor:
# supabase/migrations/20251002000001_add_payments_table.sql
```

---

## Step 5: Test Payment Flow

### Test Mode Credit Cards

Stripe provides test cards for development:

| Card Number         | Scenario           |
| ------------------- | ------------------ |
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Declined payment   |
| 4000 0025 0000 3155 | Requires 3D Secure |

- **Expiration:** Any future date
- **CVC:** Any 3 digits
- **ZIP:** Any 5 digits

### Testing Steps

1. Start your dev server: `npm run dev`
2. In another terminal, run Stripe webhook listener:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```
3. Create a test invoice in your app
4. Access client portal and click "Pay Now"
5. Use test card: `4242 4242 4242 4242`
6. Verify:
   - Payment redirects to success page
   - Invoice status updates to "paid"
   - Payment record created in database
   - Webhook events received in terminal

---

## Step 6: Go Live Checklist

Before accepting real payments:

- [ ] Complete Stripe account verification (business details, tax info)
- [ ] Link real bank account for payouts
- [ ] Switch to **live mode** API keys (starts with `pk_live_` and `sk_live_`)
- [ ] Update production webhook endpoint
- [ ] Test with real credit card (small amount like $1)
- [ ] Set up email notifications for failed payments
- [ ] Configure payout schedule in Stripe Dashboard
- [ ] Review Stripe fees: 2.9% + $0.30 per transaction

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook secret matches in `.env.local`
2. Ensure Stripe CLI is running (`stripe listen...`)
3. Check logs: `stripe logs tail`
4. Verify webhook endpoint is accessible

### Payment Intent Not Found

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check RLS policies on payments table
- Verify invoice exists and belongs to correct tenant

### Stripe API Version Mismatch

- Current version: `2024-12-18.acacia`
- Update in `src/lib/stripe.ts` if needed
- Check Stripe Dashboard > Developers > API version

---

## Security Best Practices

1. **Never commit** `.env.local` to git (already in `.gitignore`)
2. **Rotate keys** if accidentally exposed
3. **Use test mode** for all development
4. **Validate webhook signatures** (already implemented)
5. **Use service role key** only in server-side code
6. **Enable Stripe Radar** for fraud prevention (free in live mode)

---

## Support

- **Stripe Docs:** https://stripe.com/docs
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Webhook Testing:** https://stripe.com/docs/webhooks/test

---

## Quick Reference

```bash
# Install dependencies
npm install stripe @stripe/stripe-js

# Apply database migration
supabase db push

# Start dev server
npm run dev

# Listen for webhooks (separate terminal)
stripe listen --forward-to localhost:3000/api/payments/webhook

# Test webhook delivery
stripe trigger payment_intent.succeeded
```

**You're all set! 🎉**
