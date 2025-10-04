# Stripe Connect Setup Guide

## Overview

Your app now supports **Stripe Connect** - allowing you (and your users) to accept credit card payments for invoices. Payments go directly to your connected Stripe account.

## Quick Start

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up (free - no monthly fees, only pay per transaction: 2.9% + $0.30)
3. Complete verification

### 2. Get API Keys
1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Toggle to **Live mode** for production and copy the live secret key (`sk_live_`)

### 3. Environment Variables

Add to your `.env.local` (local dev) and Vercel (production):

```bash
# Stripe Secret Key (required)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# App URL (required for redirects)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4. Add to Vercel

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `STRIPE_SECRET_KEY` = `sk_live_your_live_key` (use live key for production!)
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
3. Save and redeploy

## How Stripe Connect Works

### For You (App Owner)
1. **Connect Your Account**: Go to Settings → Payments → Connect Stripe Account
2. **Complete Onboarding**: Fill out Stripe's onboarding (business info, bank account)
3. **Start Accepting Payments**: Once approved, your invoices will have a "Pay with Card" button

### For Your Clients
1. Receive invoice email with "View Invoice" button
2. Click "Pay Now" button on invoice
3. Enter card details on secure Stripe Checkout page
4. Payment goes directly to your Stripe account
5. Auto-marked as paid in your dashboard

### Payment Flow
```
Client clicks "Pay with Card"
  → Stripe Checkout opens
  → Client enters card
  → Payment processed
  → Money goes to YOUR Stripe account
  → Invoice marked as "paid" automatically
```

## Features Implemented

✅ **Stripe Connect Onboarding**
- OAuth-style setup flow
- Automatic account creation
- Status tracking (pending/active)
- Reusable for incomplete onboarding

✅ **Invoice Payments**
- "Pay with Card" button on sent/overdue invoices
- Secure Stripe Checkout (no PCI compliance needed)
- Automatic invoice status updates
- Payment success/cancel redirects

✅ **Settings Page**
- View connection status
- See account capabilities (charges/payouts enabled)
- Complete or retry onboarding
- Refresh status button

✅ **Multi-Currency Ready** (currently USD)
- Easy to add EUR, GBP, CAD, etc.

## Files Created/Modified

### API Routes
- **`/api/stripe/connect/onboard`** - Creates Stripe Connect account & onboarding link
- **`/api/stripe/connect/status`** - Checks account status & capabilities
- **`/api/stripe/create-payment`** - Creates checkout session for invoice

### Pages
- **`/dashboard/settings/payments`** - Stripe Connect management page

### Libraries
- **`src/lib/stripe-server.ts`** - Stripe server-side client

### UI Updates
- **`/dashboard/invoices`** - Added "Pay with Card" button to invoice actions

## Testing

### Test Mode (Development)
1. Use `sk_test_...` key
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires 3D Secure: `4000 0025 0000 3155`
3. Any future expiry date
4. Any 3-digit CVC

### Test Flow
1. Connect Stripe account (test mode)
2. Create client & ticket
3. Log time
4. Create & send invoice
5. Click "Pay with Card"
6. Use test card `4242 4242 4242 4242`
7. Complete payment
8. Verify invoice status changes to "paid"

## Going Live

### Checklist
1. ✅ Complete Stripe account verification
2. ✅ Add live Stripe key to Vercel (`sk_live_...`)
3. ✅ Toggle Stripe dashboard to Live mode
4. ✅ Test with real card (small amount)
5. ✅ Set up bank account for payouts
6. ✅ Configure payout schedule (daily/weekly/monthly)

### Important Notes
- **Platform Fees**: If you want to charge a fee on top of your users' transactions (for multi-user platforms), you'll need Stripe Connect Platform Fees. Current implementation is for single-user (you).
- **Payouts**: Stripe transfers money to your bank account based on your payout schedule (default: 2 days rolling)
- **Disputes**: Handle via Stripe Dashboard
- **Refunds**: Manual refunds via Stripe Dashboard (can add API integration later)

## Pricing

### Stripe Fees (Standard)
- **2.9% + $0.30** per successful card charge
- No monthly fees
- No setup fees
- Payouts to bank account: Free

### Example
- Invoice for $1,000
- Stripe fee: $29.30
- You receive: $970.70

## Troubleshooting

### "Stripe account not connected" Error
- Go to Settings → Payments
- Click "Connect Stripe Account"
- Complete onboarding
- Wait for status to show "Active"

### "Charges not enabled" Error
- Your Stripe onboarding is incomplete
- Check Stripe Dashboard for required info
- Complete verification
- Retry onboarding if needed

### Payment fails in test mode
- Use valid test card numbers from Stripe docs
- Check Stripe Dashboard logs for details
- Verify `STRIPE_SECRET_KEY` is correct test key

### Can't see "Pay with Card" button
- Invoice must be in "sent", "overdue", or "partial" status
- Stripe account must be fully connected
- Check browser console for errors

## Webhooks (Future Enhancement)

For automatic payment status updates, you can add Stripe webhooks:
1. Create webhook endpoint: `/api/stripe/webhook`
2. Listen for `payment_intent.succeeded`
3. Auto-update invoice status to "paid"

Current implementation manually updates status after checkout success redirect.

## Security

✅ **PCI Compliant** - Stripe Checkout handles all card data
✅ **No card storage** - Never touches your servers
✅ **Secure redirects** - OAuth-style flow for account linking
✅ **Metadata tracking** - Invoice ID stored with payments
✅ **Server-side only** - API keys never exposed to client

## Next Steps

After Stripe is working:
1. ✅ Test with real invoices
2. 🔄 Add webhook for auto-status updates
3. 🔄 Add refund functionality
4. 🔄 Add payment method icons (Visa/MC/Amex)
5. 🔄 Add saved payment methods
6. 🔄 Add subscription billing (recurring invoices)

---

**Ready to accept payments!** Just add your Stripe secret key to Vercel environment variables and connect your account in Settings → Payments.
