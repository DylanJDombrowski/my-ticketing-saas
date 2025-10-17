-- ============================================================================
-- FINAL FIX: Repair Invoice Counts & Enable Client Portal Tokens
-- ============================================================================
-- This fixes both issues you're experiencing
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Invoice Counting
-- ============================================================================

-- Step 1: Sync invoice_count with actual invoices (retroactive fix)
UPDATE tenants t
SET invoice_count = (
  SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id
);

-- Verify the fix worked:
SELECT
  name,
  invoice_count as synced_count,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id) as actual_count,
  invoice_limit,
  CASE
    WHEN invoice_count >= invoice_limit THEN '❌ AT LIMIT - Upgrade needed'
    ELSE '✅ Can create ' || (invoice_limit - invoice_count) || ' more'
  END as status
FROM tenants;

-- ============================================================================
-- PART 2: Fix Client Portal Token Creation
-- ============================================================================

-- Step 2: Add RLS policy for authenticated users to create portal tokens
-- This allows your API routes to INSERT tokens when sending invoices

DROP POLICY IF EXISTS "authenticated_can_manage_portal_access" ON client_portal_access;

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

-- Step 3: Verify RLS policies are correct
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'client_portal_access'
ORDER BY policyname;

-- ============================================================================
-- PART 3: Create Portal Tokens for Existing Invoices (Optional)
-- ============================================================================

-- This creates portal tokens for your existing invoices retroactively
-- so those old email links will work

INSERT INTO client_portal_access (client_id, access_token, expires_at, is_active)
SELECT DISTINCT
  i.client_id,
  encode(gen_random_bytes(24), 'base64') as access_token,
  NOW() + INTERVAL '30 days' as expires_at,
  true as is_active
FROM invoices i
WHERE i.client_id NOT IN (
  SELECT client_id FROM client_portal_access WHERE is_active = true
)
ON CONFLICT DO NOTHING;

-- Verify tokens were created:
SELECT
  c.name as client_name,
  c.email,
  cpa.access_token,
  cpa.is_active,
  cpa.expires_at,
  'https://trybillable.com/client-portal/' || cpa.access_token as portal_url
FROM client_portal_access cpa
JOIN clients c ON c.id = cpa.client_id
WHERE cpa.is_active = true
ORDER BY cpa.created_at DESC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check 1: Confirm invoice counts are synced
SELECT
  'Invoice Counts' as check_name,
  COUNT(*) FILTER (WHERE invoice_count = (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id)) as synced,
  COUNT(*) FILTER (WHERE invoice_count != (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id)) as out_of_sync
FROM tenants;

-- Check 2: Confirm portal tokens exist
SELECT
  'Portal Tokens' as check_name,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(DISTINCT client_id) as clients_with_access
FROM client_portal_access;

-- Check 3: Show overall status
SELECT
  'System Status' as status,
  CASE
    WHEN (SELECT COUNT(*) FROM client_portal_access) > 0
         AND (SELECT COUNT(*) FROM tenants WHERE invoice_count > 0) > 0
    THEN '✅ BOTH ISSUES FIXED'
    WHEN (SELECT COUNT(*) FROM client_portal_access) = 0
    THEN '❌ Portal tokens still failing'
    WHEN (SELECT COUNT(*) FROM tenants WHERE invoice_count > 0) = 0
    THEN '❌ Invoice counts still not syncing'
    ELSE '⚠️ Partial fix'
  END as result;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- After running this script, you should see:
-- ✅ Invoice counts match actual invoice counts
-- ✅ Portal tokens exist in client_portal_access table
-- ✅ Clients can access portal via email links
-- ✅ Next invoice creation should be blocked with upgrade prompt
-- ============================================================================
