# Quick Fix Checklist - Diagnose Both Issues

## Issue 1: Invoice Limit Not Working ❌

**Problem**: You can create more than 2 invoices on free plan

### Root Causes (Check These):

1. **Database migrations not run** ✅ Check First
   - Run `DEBUG_ISSUES.sql` in Supabase SQL Editor
   - Look at first query result - should show all Stripe columns
   - If NO columns shown → Migrations never ran

2. **Trigger not created** ✅ Check Second
   - Look at query #3 result in debug script
   - Should show `on_invoice_created` trigger
   - If NO trigger → Run `MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql`

3. **Invoice count not incrementing** ✅ Check Third
   - Look at query #4 - compare `stored_count` vs `actual_invoice_count`
   - If they don't match → Run the UPDATE query at bottom of debug script

### Quick Test:
```sql
-- Run this to see your current state:
SELECT
  name,
  invoice_count,
  invoice_limit,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id) as actual_count
FROM tenants;
```

**Expected**: `invoice_count` should equal number of invoices created

---

## Issue 2: Client Portal "Access Denied" Error ❌

**Problem**: Email links show "Invalid or expired access token"

### Root Causes (Check These):

1. **client_portal_access table is empty** ✅ Check First
   - Run query #5 from `DEBUG_ISSUES.sql`
   - Should show rows with access tokens
   - If EMPTY → Tokens never created, insert is failing silently

2. **RLS policies blocking token creation** ✅ Most Likely Issue
   - The API route uses authenticated role
   - But it might not have permission to INSERT into client_portal_access
   - Need to check/fix RLS policies

3. **Wrong token being sent in email** ✅ Check Third
   - Run query #6 to see invoices vs tokens
   - Check if `access_token` column is NULL

### Let's Check RLS Policies:
```sql
-- See what policies exist on client_portal_access
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'client_portal_access';
```

### Expected RLS Setup:
- **authenticated role**: SELECT, INSERT, UPDATE (for creating tokens)
- **anon role**: SELECT only (for client portal access)

---

## Quick Fix Actions:

### Fix 1: Enable Invoice Limit Enforcement

**Step 1**: Run migrations if not already done
```bash
# In Supabase SQL Editor:
# 1. Run MANUAL_RUN_THIS_STRIPE_MIGRATION.sql
# 2. Run MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql
```

**Step 2**: Sync invoice counts
```sql
UPDATE tenants t
SET invoice_count = (
  SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id
);
```

**Step 3**: Test the limit
1. Check your current count: Should be at your current invoice total
2. Set limit to current count for testing:
   ```sql
   UPDATE tenants SET invoice_limit = (
     SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id
   )
   WHERE id = 'YOUR_TENANT_ID';
   ```
3. Try creating another invoice → Should see upgrade prompt

---

### Fix 2: Fix Client Portal Access

**Step 1**: Check if tokens are being created
```sql
-- See if ANY tokens exist
SELECT COUNT(*) FROM client_portal_access;

-- If 0, check insert permissions
```

**Step 2**: Add RLS policy for authenticated users to create tokens
```sql
-- Allow authenticated users (your API) to create portal access
CREATE POLICY "authenticated_can_manage_portal_access"
ON client_portal_access
FOR ALL
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN tenants t ON t.id = c.tenant_id
    JOIN profiles p ON p.tenant_id = t.id
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN tenants t ON t.id = c.tenant_id
    JOIN profiles p ON p.tenant_id = t.id
    WHERE p.id = auth.uid()
  )
);
```

**Step 3**: Test token creation
1. Send an invoice email
2. Check server logs for:
   - `[Send Invoice] Portal URL:` - should show full URL
   - `[Send Invoice] Token:` - should show actual token
   - Any errors about INSERT failing

**Step 4**: Check database after sending
```sql
SELECT * FROM client_portal_access ORDER BY created_at DESC LIMIT 1;
```
Should show the newly created token

**Step 5**: Test the portal link
- Copy the token from the email
- Go to: `https://trybillable.com/client-portal/[TOKEN]`
- Should load portal, not "Access Denied"

---

## Debugging Steps (Do These In Order):

### 1. Check Database State
```bash
# Run DEBUG_ISSUES.sql in Supabase SQL Editor
# Review all query results
```

### 2. Check Server Logs
```bash
# In your terminal where dev server runs:
# Look for these log lines when sending invoice:

[Send Invoice] Portal URL: https://trybillable.com/client-portal/ABC123...
[Send Invoice] Token: ABC123...
[Send Invoice] Error creating portal access: { ... }  # BAD if present
```

### 3. Check Email Content
- Open the email you received
- View source / inspect the HTML
- Find the portal link - does it have a real token or just numbers?
- **GOOD**: `/client-portal/kJ8mNp2qR...` (long random string)
- **BAD**: `/client-portal/123e4567...` (looks like UUID)

### 4. Test Portal Directly
```bash
# Get a token from database:
SELECT access_token FROM client_portal_access WHERE is_active = true LIMIT 1;

# Visit in browser:
https://trybillable.com/client-portal/[THAT_TOKEN]

# Should work if:
- Token exists in database
- RLS allows anon access
- Token not expired
```

---

## Most Likely Issues & Fixes:

### Issue 1: Migrations Never Ran
**Symptom**: No `invoice_count` column exists
**Fix**: Run `MANUAL_RUN_THIS_STRIPE_MIGRATION.sql`

### Issue 2: Trigger Not Created
**Symptom**: `invoice_count` stays at 0
**Fix**: Run `MANUAL_RUN_THIS_STRIPE_FUNCTIONS.sql`

### Issue 3: RLS Blocking Token Inserts
**Symptom**: `client_portal_access` table is empty
**Fix**: Add RLS policy for authenticated role (see above)

### Issue 4: Wrong Token in Email
**Symptom**: Email shows invoice ID instead of access token
**Fix**: Check if `finalAccessToken` is actually being set correctly

---

## Next Steps:

1. **Run `DEBUG_ISSUES.sql`** → Report back what you see
2. **Check server logs** when sending invoice → Look for errors
3. **Share results** and I'll pinpoint exact issue

Would you like me to create a more automated diagnostic script that checks everything at once?
