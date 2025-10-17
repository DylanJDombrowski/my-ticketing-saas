# 🧪 Complete Testing Checklist

## 📋 Prerequisites

Before testing, make sure you've run:
- [x] `FIX_BOTH_ISSUES_NOW.sql` in Supabase SQL Editor
- [x] Fixed Stripe API version error (just completed)

---

## Part 1: Invoice Limit Enforcement ✅

### Test 1.1: Verify Invoice Count is Synced

**Run this SQL query:**
```sql
SELECT
  name,
  invoice_count,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id) as actual,
  invoice_limit
FROM tenants;
```

**Expected Result:**
```
name                          | invoice_count | actual | invoice_limit
------------------------------|---------------|--------|---------------
Dombrowski Technologies LLC   | 4             | 4      | 2
```

✅ **PASS**: invoice_count matches actual count
❌ **FAIL**: If they don't match, re-run the UPDATE query from FIX_BOTH_ISSUES_NOW.sql

---

### Test 1.2: Try to Create 5th Invoice (Should Block)

**Steps:**
1. Log into dashboard: https://trybillable.com/dashboard
2. Go to Invoices
3. Click "Create Invoice" or "Quick Invoice"
4. Fill in details and submit

**Expected Result:**
- ❌ **Upgrade prompt should appear** (modal with "You've reached your free plan limit")
- ❌ **Invoice should NOT be created**
- ✅ **Modal shows**: "2 / 2 invoices" used

**Actual Result:** _[Fill this in after testing]_

---

### Test 1.3: Upgrade Flow

**Steps:**
1. In upgrade prompt, click **"Upgrade Now"**
2. Should redirect to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Should redirect back to dashboard

**Expected Result:**
- ✅ Redirects to Stripe (URL starts with checkout.stripe.com)
- ✅ Shows "Billable Pro - $6.99/month"
- ✅ After payment, returns to: `/dashboard/settings?session_id=...&success=true`

**Actual Result:** _[Fill this in after testing]_

---

### Test 1.4: Verify Subscription Activated

**Run this SQL query after payment:**
```sql
SELECT
  name,
  subscription_status,
  invoice_limit,
  stripe_customer_id,
  stripe_subscription_id
FROM tenants;
```

**Expected Result:**
```
name                          | subscription_status | invoice_limit | stripe_customer_id | stripe_subscription_id
------------------------------|---------------------|---------------|--------------------|-----------------------
Dombrowski Technologies LLC   | active             | 999999        | cus_...           | sub_...
```

✅ **PASS**: subscription_status = 'active' and invoice_limit = 999999
❌ **FAIL**: If status is still 'free', webhook didn't fire

---

### Test 1.5: Create Unlimited Invoices (After Upgrade)

**Steps:**
1. After upgrading, try to create 5th, 6th, 7th invoice
2. Should work without any blocking

**Expected Result:**
- ✅ Invoices create successfully
- ✅ No upgrade prompt appears
- ✅ invoice_count increments properly (5, 6, 7...)

**Actual Result:** _[Fill this in after testing]_

---

## Part 2: Client Portal Access ✅

### Test 2.1: Verify Portal Tokens Exist

**Run this SQL query:**
```sql
SELECT
  c.name as client_name,
  c.email,
  cpa.access_token,
  cpa.is_active,
  'https://trybillable.com/client-portal/' || cpa.access_token as portal_url
FROM client_portal_access cpa
JOIN clients c ON c.id = cpa.client_id
WHERE cpa.is_active = true;
```

**Expected Result:**
- Should show at least 1 row
- `access_token` should be a long random string (not NULL)
- `is_active` should be true

✅ **PASS**: Tokens exist
❌ **FAIL**: If no rows or access_token is NULL, RLS policy didn't work

---

### Test 2.2: Send New Invoice Email

**Steps:**
1. Create a new invoice (after upgrading to bypass limit)
2. In invoice list, click "Send" button
3. Confirm send
4. Check your email inbox

**Expected Result:**
- ✅ Email received with subject "Invoice INV-2025-XXXX from..."
- ✅ Email contains "Pay This Invoice" button
- ✅ Email contains "View Client Portal" button
- ✅ Buttons have links like: `/client-portal/{LONG_TOKEN}`

**Actual Result:** _[Fill this in after testing]_

---

### Test 2.3: Test Portal Link from Email

**Steps:**
1. Open the invoice email
2. Click "View Client Portal" button
3. Should load client portal page

**Expected Result:**
- ✅ Portal loads successfully
- ✅ Shows: "Welcome, [Client Name]!"
- ✅ Displays invoice statistics (Total Invoiced, Paid, Pending)
- ✅ Shows list of invoices
- ✅ Can view/download PDF

**Actual Result:** _[Fill this in after testing]_

❌ **If you see "Access Denied"**:
- Check server logs for errors
- Verify token in URL matches database
- Check RLS policies were created

---

### Test 2.4: Test Old Portal Links (Retroactive Fix)

**Steps:**
1. Find an old invoice email you sent before
2. Click the portal link
3. Should work now (if retroactive token was created)

**Expected Result:**
- ✅ Portal loads (if token was created retroactively)
- ❌ Access Denied (if client didn't have invoices when fix ran)

**Note**: This only works if the client had at least one invoice when you ran FIX_BOTH_ISSUES_NOW.sql

**Actual Result:** _[Fill this in after testing]_

---

### Test 2.5: Test Invoice Reminder

**Steps:**
1. Go to invoice list
2. Click "..." menu on an invoice
3. Click "Send Reminder"
4. Check email

**Expected Result:**
- ✅ Reminder email received
- ✅ Contains portal link with proper token
- ✅ Portal link works when clicked

**Actual Result:** _[Fill this in after testing]_

---

## Part 3: Stripe Webhook Integration ✅

### Test 3.1: Verify Webhook is Configured

**Check Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint
3. Click on it to see details

**Expected Configuration:**
- Endpoint URL: `https://trybillable.com/api/stripe/webhook`
- Status: Enabled ✅
- Events:
  - ✅ checkout.session.completed
  - ✅ customer.subscription.updated
  - ✅ customer.subscription.deleted
  - ✅ invoice.payment_succeeded
  - ✅ invoice.payment_failed

**Actual Result:** _[Fill this in after checking]_

---

### Test 3.2: Test Webhook Event Delivery

**After completing payment in Test 1.3:**
1. Go to: https://dashboard.stripe.com/test/events
2. Look for recent events
3. Click on `checkout.session.completed` event
4. Check "Webhook attempts" section

**Expected Result:**
- ✅ Shows webhook attempt to your endpoint
- ✅ Response: 200 OK
- ✅ Response body: `{"received":true}`

**Actual Result:** _[Fill this in after testing]_

❌ **If webhook failed**:
- Check STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
- Check server logs for errors
- Verify endpoint is accessible publicly

---

### Test 3.3: Test Subscription Cancellation

**Steps:**
1. Go to: https://dashboard.stripe.com/test/subscriptions
2. Find your test subscription
3. Click "Cancel subscription"
4. Confirm cancellation

**Expected Result in Database:**
```sql
SELECT subscription_status, invoice_limit FROM tenants;
```
- subscription_status should change to 'canceled'
- invoice_limit should revert to 2

**Actual Result:** _[Fill this in after testing]_

---

## Part 4: Edge Cases & Error Handling ✅

### Test 4.1: Multiple Clients Same Tenant

**If you have multiple clients:**
1. Send invoices to 2 different clients
2. Each should get their own portal token
3. Each portal should only show THEIR invoices

**Expected Result:**
- ✅ Client A sees only their invoices
- ✅ Client B sees only their invoices
- ❌ Client A cannot see Client B's data

**Actual Result:** _[Fill this in if applicable]_

---

### Test 4.2: Expired Tokens

**To test token expiration:**
1. In database, set a token to expired:
```sql
UPDATE client_portal_access
SET expires_at = NOW() - INTERVAL '1 day'
WHERE client_id = (SELECT id FROM clients LIMIT 1);
```

2. Try to access portal with that token

**Expected Result:**
- ❌ Shows "Access Denied - Token expired"
- ✅ Sending new invoice email creates fresh token

**Actual Result:** _[Fill this in after testing]_

---

### Test 4.3: Invoice Count Accuracy

**After creating several invoices:**
```sql
SELECT
  name,
  invoice_count,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id) as actual
FROM tenants;
```

**Expected Result:**
- invoice_count should ALWAYS match actual count
- Trigger should increment automatically on new invoices

**Actual Result:** _[Fill this in after creating invoices]_

---

## 🎯 Success Criteria Summary

### ✅ All Tests Pass When:

**Invoice Limits:**
- [  ] Can't create more than 2 invoices on free plan
- [  ] Upgrade prompt appears at limit
- [  ] Stripe checkout works
- [  ] After payment, can create unlimited invoices
- [  ] Subscription status updates in database

**Client Portal:**
- [  ] Portal tokens are created when sending invoices
- [  ] Portal links in emails work
- [  ] Portal displays correct invoice data
- [  ] Access tokens properly restrict access
- [  ] Reminder emails have working portal links

**Stripe Integration:**
- [  ] Webhook receives and processes events
- [  ] Subscription activation updates database
- [  ] Cancellation reverts to free plan
- [  ] Payment failures are tracked

---

## 🐛 Common Issues & Fixes

### Issue: Upgrade prompt doesn't show
**Fix**: Run FIX_BOTH_ISSUES_NOW.sql again, check invoice_count is synced

### Issue: Portal shows "Access Denied"
**Fix**: Check RLS policy exists:
```sql
SELECT * FROM pg_policies WHERE tablename = 'client_portal_access';
```

### Issue: Webhook not working
**Fix**:
1. Check STRIPE_WEBHOOK_SECRET in .env
2. Verify endpoint is publicly accessible
3. Check Stripe Dashboard for error details

### Issue: Invoice count not incrementing
**Fix**: Trigger might not be working. Check:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_invoice_created';
```

---

## 📊 Final Verification Query

**Run this to see overall system health:**
```sql
-- Comprehensive status check
SELECT
  'Invoice Limits' as feature,
  CASE
    WHEN t.invoice_count = (SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id)
    THEN '✅ Working'
    ELSE '❌ Broken'
  END as status
FROM tenants t
UNION ALL
SELECT
  'Portal Tokens' as feature,
  CASE
    WHEN (SELECT COUNT(*) FROM client_portal_access WHERE is_active = true) > 0
    THEN '✅ Working'
    ELSE '❌ Broken'
  END as status
UNION ALL
SELECT
  'Subscription' as feature,
  CASE
    WHEN subscription_status IN ('active', 'trialing')
    THEN '✅ Active'
    WHEN subscription_status = 'free'
    THEN 'ℹ️ Free Plan'
    ELSE '⚠️ ' || subscription_status
  END as status
FROM tenants;
```

---

## 📝 Notes Section

**Session Date**: _[Today's date]_

**Tests Completed**: _[X/20]_

**Issues Found**: _[List any issues]_

**Next Steps**: _[What needs to be done]_

---

**Happy Testing! 🚀**
