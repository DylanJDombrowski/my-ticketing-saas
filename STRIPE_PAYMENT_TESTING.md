# Stripe Payment Integration - Testing Guide

## ✅ Current Status

### What's Working
- ✅ Stripe API keys configured (test mode)
- ✅ Resend email configured (`invoices@trybillable.com`)
- ✅ Payment webhook endpoint created (`/api/payments/webhook`)
- ✅ Checkout session API working (`/api/payments/create-checkout`)
- ✅ Automatic invoice status updates via webhook
- ✅ Payment success/cancel pages created
- ✅ Database schema for payments table
- ✅ "Change Status" dropdown now functional

### Environment Variables Configured
```bash
RESEND_API_KEY=re_MJKRgXaH_*** (configured)
RESEND_FROM_EMAIL=invoices@trybillable.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NDVtdK2b4tXVyKZ603***
STRIPE_SECRET_KEY=sk_test_51NDVtdK2b4tXVyKZL7VLstVfHv***
STRIPE_WEBHOOK_SECRET=whsec_Yu5OfMCx7V9J384bILCRvNx7701***
```

---

## 🧪 Testing Checklist

### 1. Test Email Notifications

**Goal:** Verify Resend is sending invoice emails properly

**Steps:**
1. Start dev server: `npm run dev`
2. Log in to dashboard
3. Create a client with YOUR email address
4. Create a ticket for that client
5. Log some time entries for the ticket
6. Create an invoice from time entries
7. Click the **3-dot menu** on the invoice
8. Click **Send Invoice**
9. Check your email inbox for invoice email

**Expected Result:**
- ✅ Email arrives with subject: "Invoice [number] from [your tenant name]"
- ✅ Email has purple gradient header
- ✅ Shows correct invoice number, amount, dates
- ✅ "View Invoice PDF" button works
- ✅ Invoice status changes to "sent" in dashboard

**Troubleshooting:**
- If no email arrives, check Resend dashboard logs: https://resend.com/emails
- Verify `RESEND_FROM_EMAIL` is verified domain or `onboarding@resend.dev`
- Check browser console for errors

---

### 2. Test Stripe Webhook (Local Development)

**Goal:** Ensure webhooks receive and process payment events

**Prerequisites:**
- Install Stripe CLI: `brew install stripe/stripe-cli/stripe`

**Steps:**

**Terminal 1 - Dev Server:**
```bash
npm run dev
```

**Terminal 2 - Stripe Webhook Listener:**
```bash
# Login to Stripe (one-time setup)
stripe login

# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/payments/webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_xxx (stored in .env.local)
> Listening on http://localhost:3000/api/payments/webhook
```

**Keep this terminal open!** You'll see webhook events here when payments are made.

---

### 3. Test Payment Flow (End-to-End)

**Goal:** Complete a full payment from invoice creation to paid status

**Steps:**

**A. Create Invoice**
1. In dashboard, go to **Invoices**
2. Click **Create Invoice**
3. Select a client (or create one with your email)
4. Add time entries or create manual line items
5. Set due date
6. Click **Create Invoice**

**B. Send Invoice**
1. Find invoice in list
2. Click **3-dot menu** → **Send Invoice**
3. Verify email arrives (check inbox)

**C. Pay Invoice**
1. In invoice list, find the sent invoice
2. Click **3-dot menu** → **Pay with Card**
3. Should redirect to Stripe Checkout page

**D. Complete Payment (Stripe Checkout)**
1. Use test card number: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., `12/34`)
3. CVC: Any 3 digits (e.g., `123`)
4. ZIP: Any 5 digits (e.g., `12345`)
5. Email: Your email
6. Click **Pay**

**E. Verify Success**
1. Should redirect to `/client-portal/payment-success`
2. Should see green checkmark and success message
3. Check **Terminal 2** (Stripe webhook listener) - should see events:
   ```
   checkout.session.completed
   payment_intent.succeeded
   ```
4. Go back to dashboard → Invoices
5. Invoice status should now be **paid** (green badge)

**Expected Webhook Events in Terminal 2:**
```
2025-10-04 12:34:56   --> checkout.session.completed [evt_xxx]
2025-10-04 12:34:57   --> payment_intent.succeeded [evt_xxx]
```

**Troubleshooting:**
- If redirect fails, check `NEXT_PUBLIC_APP_URL` is set
- If webhook not received, ensure Stripe CLI is running
- If invoice not marked paid, check Terminal 2 for webhook errors
- Check Stripe Dashboard → Payments to verify payment was created

---

### 4. Test Failed Payment

**Goal:** Verify failed payments are handled gracefully

**Steps:**
1. Create and send an invoice
2. Click **Pay with Card**
3. Use decline test card: `4000 0000 0000 0002`
4. Complete checkout form
5. Should show error message
6. Invoice should remain in "sent" status

---

### 5. Test Payment Cancel

**Goal:** Verify user can cancel payment and return

**Steps:**
1. Create and send an invoice
2. Click **Pay with Card**
3. On Stripe Checkout page, click **← Back** or close tab
4. Should redirect to `/client-portal/payment-cancel`
5. Should see yellow warning icon and cancel message
6. Invoice should remain in "sent" status

---

## 🔧 Manual Testing Scenarios

### Change Invoice Status
1. Go to Invoices page
2. Find any invoice
3. Click **3-dot menu** → **Change Status**
4. Enter new status (e.g., "paid", "cancelled", "overdue")
5. Status should update immediately

### Bulk Invoice Actions
1. Select multiple invoices (checkboxes)
2. Click **Bulk Actions** dropdown
3. Choose action (Mark as Sent/Paid/Cancelled)
4. All selected invoices should update

---

## 🌐 Testing in Production

### Before Going Live:

1. **Switch to Live Stripe Keys**
   - In Stripe Dashboard, toggle to **Live mode**
   - Copy live keys: `pk_live_***` and `sk_live_***`
   - Update Vercel environment variables

2. **Verify Domain in Resend**
   - Add your domain (e.g., `trybillable.com`)
   - Add DNS records (MX, TXT, DKIM)
   - Verify status shows "Verified"

3. **Update Webhook in Stripe**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://trybillable.com/api/payments/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy new webhook secret
   - Update `STRIPE_WEBHOOK_SECRET` in Vercel

4. **Test with Small Amount**
   - Create real invoice for $1.00
   - Use real credit card
   - Verify payment processes
   - Check bank payout in Stripe Dashboard (2-3 days)

---

## 🐛 Common Issues & Solutions

### "Invoice does not have a Stripe Connect account"
**Cause:** You haven't connected your Stripe account
**Solution:**
- Go to Settings → Payments
- Click "Connect Stripe Account"
- Complete Stripe onboarding

### "Webhook signature verification failed"
**Cause:** Webhook secret mismatch
**Solution:**
- Check `STRIPE_WEBHOOK_SECRET` in `.env.local` matches Stripe CLI output
- Restart dev server after changing env vars

### "Payment succeeded but invoice not marked paid"
**Cause:** Webhook not processing correctly
**Solution:**
- Check Terminal 2 for webhook errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check database permissions on payments/invoices tables

### "Email not arriving"
**Cause:** Resend configuration issue
**Solution:**
- Check Resend dashboard logs
- Verify `RESEND_FROM_EMAIL` domain is verified
- For testing, use `onboarding@resend.dev`

### "Payment button not showing"
**Cause:** Invoice status or Stripe connection
**Solution:**
- Invoice must be "sent", "overdue", or "partial" status
- Stripe account must be connected and verified
- Check browser console for errors

---

## 📊 Database Check

After successful payment, verify database records:

**Check Payment Record:**
```sql
SELECT * FROM payments
WHERE invoice_id = 'your-invoice-id'
ORDER BY created_at DESC;
```

**Should show:**
- `status: 'succeeded'`
- `stripe_payment_intent_id: 'pi_xxx'`
- `paid_at: timestamp`

**Check Invoice:**
```sql
SELECT id, invoice_number, status, total_amount
FROM invoices
WHERE id = 'your-invoice-id';
```

**Should show:**
- `status: 'paid'`

---

## 🚀 Next Steps

Once testing passes:

1. ✅ Complete local testing with Stripe CLI
2. ✅ Test email delivery end-to-end
3. ✅ Test payment success/cancel/failure flows
4. 🔄 Add Stripe Connect for multi-tenant (optional)
5. 🔄 Add subscription billing for SaaS revenue
6. 🔄 Add automated payment reminders for overdue invoices
7. 🔄 Integrate client portal with magic link auth

---

## 📝 Testing Log Template

Use this to track your testing:

```
Date: 2025-10-04
Tester: Dylan

[ ] Email notification test
    Result:
    Notes:

[ ] Stripe webhook local test
    Result:
    Notes:

[ ] End-to-end payment test
    Result:
    Notes:

[ ] Failed payment test
    Result:
    Notes:

[ ] Payment cancel test
    Result:
    Notes:

[ ] Change status test
    Result:
    Notes:

Issues found:
1.
2.

Next actions:
1.
2.
```

---

**Ready to test!** Start with the email notification test, then move to the full payment flow with Stripe CLI running.
