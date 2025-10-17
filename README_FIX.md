# 🔧 Quick Fix - Run This Now!

## 🎯 The Problem (Confirmed):

1. **Invoice Limit Not Working**: You have 4 invoices but `invoice_count` shows 0
   - Trigger exists but counts weren't synced for old invoices

2. **Client Portal Broken**: All portal tokens are NULL
   - RLS policy is blocking authenticated users from creating tokens

## ✅ The Solution (One File):

### Run This Single File:
```
FIX_BOTH_ISSUES_NOW.sql
```

**Where to run it:**
1. Go to: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql
2. Copy contents of `FIX_BOTH_ISSUES_NOW.sql`
3. Paste and click "Run"
4. Review the verification queries at the bottom

---

## 📊 What This Script Does:

### Part 1: Fix Invoice Counts
```sql
-- Syncs invoice_count to match actual invoices
UPDATE tenants SET invoice_count = (actual count)
```
**Result**: Your count will change from 0 → 4

### Part 2: Fix Client Portal
```sql
-- Adds RLS policy so API can create tokens
CREATE POLICY "authenticated_can_manage_portal_access"
```
**Result**: Future invoice emails will have working portal links

### Part 3: Create Missing Tokens (Bonus)
```sql
-- Creates tokens for existing clients retroactively
INSERT INTO client_portal_access (for each client)
```
**Result**: Old email links will start working too!

---

## 🧪 After Running The Script:

### Test 1: Check Invoice Limit
1. Try to create a 5th invoice
2. **Expected**: Upgrade prompt should appear ✅
3. **Why**: You now have `invoice_count = 4` and `invoice_limit = 2`

### Test 2: Check Client Portal
1. Send a new invoice email
2. Click the portal link in email
3. **Expected**: Portal loads with invoices ✅
4. **Why**: RLS policy now allows token creation

### Test 3: Old Email Links
1. Find an old invoice email (if you kept one)
2. Click the portal link
3. **Expected**: Might work now if token was created retroactively ✅

---

## 📈 Expected Results from Script:

After running, you should see output like:

```sql
-- Invoice Counts Status:
name                          | synced_count | actual_count | status
------------------------------|--------------|--------------|------------------
Dombrowski Technologies LLC   | 4            | 4            | ❌ AT LIMIT

-- Portal Tokens Status:
check_name    | total_tokens | active_tokens | clients_with_access
--------------|--------------|---------------|--------------------
Portal Tokens | 1            | 1             | 1

-- Overall Status:
status        | result
--------------|-------------------
System Status | ✅ BOTH ISSUES FIXED
```

---

## 🚀 Next Steps After Fix:

1. **Test Upgrade Flow**:
   - Try to create 5th invoice
   - Click "Upgrade Now"
   - Complete Stripe checkout
   - Verify you can create unlimited invoices

2. **Send Test Invoice**:
   - Create a new invoice (after upgrading)
   - Send it to client
   - Verify portal link works

3. **Check Your Stripe Webhooks**:
   - Make sure webhook is configured: https://dashboard.stripe.com/test/webhooks
   - Endpoint: `https://trybillable.com/api/stripe/webhook`
   - Events: All the ones I listed earlier

---

## 🗂 File Cleanup Done:

Archived these old files to `sql-archive/`:
- ~~DEBUG_ISSUES.sql~~ (replaced by FIX_BOTH_ISSUES_NOW.sql)
- ~~MANUAL_RUN_THIS_STRIPE_MIGRATION.sql~~ (already ran)
- ~~MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql~~ (already ran)
- ~~diagnose-client-portal.sql~~ (not needed anymore)
- ~~fix-client-portal.sql~~ (replaced by FIX_BOTH_ISSUES_NOW.sql)

**Keep only**: `FIX_BOTH_ISSUES_NOW.sql` (run this now!)

---

## ❓ Questions?

**Q: Why did the trigger not count old invoices?**
A: The trigger only fires on NEW inserts. Old invoices created before the trigger need manual sync.

**Q: Why couldn't tokens be created?**
A: The authenticated role (your API) didn't have permission to INSERT into `client_portal_access`. RLS was blocking it.

**Q: Will future invoices work correctly?**
A: Yes! After this fix:
- New invoices will auto-increment count (trigger works)
- New invoices will create tokens (RLS policy fixed)
- Limit will be enforced (count is accurate)

---

**Ready? Run `FIX_BOTH_ISSUES_NOW.sql` now!** 🎯
