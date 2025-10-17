# Stripe Subscription Setup Guide

## 🎯 Overview
This guide walks you through setting up Stripe subscriptions for your Billable SaaS application.

**Pricing Model:**
- **Free Plan**: 2 invoices maximum, then upgrade required
- **Pro Plan**: $6.99/month - Unlimited invoices, clients, and features

---

## ✅ Step 1: Run Database Migrations

### 1a. Add Stripe Fields to Tenants Table
Run this in your Supabase SQL Editor:

```bash
Open: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql
```

Copy and paste the contents of: `MANUAL_RUN_THIS_STRIPE_MIGRATION.sql`

### 1b. Add Helper Functions
After the first migration completes, run:

Copy and paste the contents of: `MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql`

---

## ✅ Step 2: Create Stripe Products

### Go to Stripe Dashboard
https://dashboard.stripe.com/test/products

### Create the Pro Plan Product

1. Click **"+ Add product"**
2. Fill in details:
   - **Name**: Billable Pro
   - **Description**: Unlimited invoices, clients, and time tracking
   - **Pricing**: Recurring
   - **Price**: $6.99 USD
   - **Billing period**: Monthly
   - **Price ID**: Copy this! You'll need it for the code

### Update the Code with Price ID (Optional)
If you want to use a Stripe Price instead of creating it dynamically, update:

`src/app/api/stripe/create-checkout/route.ts` line 58:

```typescript
// Replace price_data with your Price ID:
price: "price_YOUR_PRICE_ID_HERE", // Use your actual Stripe Price ID
```

---

## ✅ Step 3: Configure Stripe Webhooks

### Create Webhook Endpoint

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://trybillable.com/api/stripe/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_`)
6. Update your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

---

## ✅ Step 4: Test the Integration

### Test Flow:

1. **Sign up** for a new account (or use existing)
2. **Create 2 invoices** (free limit)
3. **Try to create a 3rd invoice** → Upgrade prompt should appear
4. **Click "Upgrade Now"** → Redirects to Stripe Checkout
5. **Complete payment** with test card: `4242 4242 4242 4242`
6. **Verify** you're redirected back to dashboard
7. **Create unlimited invoices** ✅

### Test Cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Require Auth**: 4000 0025 0000 3155

---

## ✅ Step 5: Test Webhook Processing

### Trigger Webhook Events:

1. Go to: https://dashboard.stripe.com/test/events
2. Click **"Send test webhook"**
3. Test these events:
   - `checkout.session.completed` → Should activate subscription
   - `customer.subscription.updated` → Should update status
   - `customer.subscription.deleted` → Should revert to free plan

### Verify in Database:
```sql
SELECT
  name,
  subscription_status,
  invoice_count,
  invoice_limit,
  stripe_customer_id
FROM tenants;
```

---

## ✅ Step 6: Go Live (Production)

### Switch to Live Mode:

1. Get **Live API keys** from Stripe Dashboard
2. Create **Live webhook** endpoint (same events)
3. Update **Production `.env`**:

```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

4. Update pricing if needed (currently $6.99/month)
5. Test with a small real payment first

---

## 🛠 Troubleshooting

### Issue: Upgrade prompt doesn't appear
**Fix**: Check browser console for errors. Verify `/api/subscription/check-limit` returns correct data.

### Issue: Webhook not working
**Fix**:
- Verify webhook endpoint URL is correct
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- View logs: https://dashboard.stripe.com/test/logs

### Issue: Invoice count not incrementing
**Fix**: Verify the database trigger was created:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_invoice_created';
```

### Issue: Client portal links broken
**Fix**: Verified and fixed! Tokens now properly generated and used.

---

## 📊 Current Status

### ✅ Completed Features:
1. ✅ Client portal authentication fixed (send-email + send-reminder)
2. ✅ All ticket references removed from client portal
3. ✅ Stripe subscription database schema ready
4. ✅ Stripe checkout API route created
5. ✅ Stripe webhook handler implemented
6. ✅ Invoice limit checking system
7. ✅ Upgrade prompt UI component
8. ✅ Invoice creation flow with limit enforcement

### 📋 Remaining Tasks:
1. ⏳ Run database migrations (manual)
2. ⏳ Create Stripe products in dashboard
3. ⏳ Configure webhook endpoint
4. ⏳ Test complete flow
5. ⏳ Deploy to production

---

## 🚀 Quick Start Commands

```bash
# Start dev server
npm run dev

# Test client portal locally
# (After sending invoice, click the portal link in email)

# Check invoice limits
# Go to: http://localhost:3000/api/subscription/check-limit?tenant_id=YOUR_TENANT_ID
```

---

## 📧 Support

Questions? Email: support@trybillable.com

---

## 🎉 Success Criteria

Your Stripe integration is working when:

1. ✅ New users can create 2 invoices for free
2. ✅ 3rd invoice attempt shows upgrade prompt
3. ✅ Upgrade flow redirects to Stripe and back
4. ✅ After payment, invoice_limit = 999999 in database
5. ✅ Users can create unlimited invoices after upgrading
6. ✅ Client portal links work for invoice viewing

---

**Built with ❤️ for Billable - Simple, Fast Invoicing**
