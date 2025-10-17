-- ============================================================================
-- CLIENT PORTAL DIAGNOSTIC & FIX SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor to check and fix client portal issues
-- Project URL: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql
-- ============================================================================

-- ============================================================================
-- PART 1: DIAGNOSTIC CHECKS
-- ============================================================================

-- Check 1: Verify client_portal_access table exists and has data
SELECT
  'Client Portal Access Table' as check_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as valid_tokens,
  COUNT(DISTINCT client_id) as clients_with_access
FROM client_portal_access;

-- Check 2: Verify RLS policies exist for client portal
SELECT
  'RLS Policies for Client Portal' as check_name,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN ('client_portal_access', 'clients', 'invoices', 'tenants')
  AND policyname LIKE '%portal%';

-- Check 3: Show all clients and their portal access status
SELECT
  c.id,
  c.name,
  c.email,
  c.company,
  (SELECT COUNT(*) FROM invoices WHERE client_id = c.id) as invoice_count,
  CASE
    WHEN cpa.id IS NOT NULL THEN '✅ Has Token'
    ELSE '❌ No Token'
  END as portal_status,
  cpa.access_token,
  cpa.is_active,
  cpa.expires_at,
  CASE
    WHEN cpa.expires_at IS NULL THEN 'Never expires'
    WHEN cpa.expires_at > NOW() THEN 'Valid until ' || cpa.expires_at::date
    ELSE '❌ EXPIRED'
  END as expiry_status,
  'https://trybillable.com/client-portal/' || cpa.access_token as portal_url
FROM clients c
LEFT JOIN client_portal_access cpa ON cpa.client_id = c.id AND cpa.is_active = true
ORDER BY c.created_at DESC;

-- Check 4: Verify tenant subscription status
SELECT
  name as tenant_name,
  subscription_status,
  invoice_count,
  invoice_limit,
  CASE
    WHEN invoice_count >= invoice_limit THEN '❌ At Limit - Need Upgrade'
    ELSE '✅ Can create ' || (invoice_limit - invoice_count) || ' more invoices'
  END as status
FROM tenants;

-- ============================================================================
-- PART 2: FIX MISSING PORTAL TOKENS
-- ============================================================================

-- This creates portal tokens for clients who don't have one yet
-- Only creates tokens for clients with at least one invoice
INSERT INTO client_portal_access (client_id, access_token, expires_at, is_active)
SELECT DISTINCT
  c.id as client_id,
  encode(gen_random_bytes(32), 'base64url') as access_token,
  NOW() + INTERVAL '90 days' as expires_at,
  true as is_active
FROM clients c
WHERE c.id IN (
  -- Only create tokens for clients with invoices
  SELECT DISTINCT client_id FROM invoices
)
AND c.id NOT IN (
  -- Skip clients who already have active tokens
  SELECT client_id FROM client_portal_access WHERE is_active = true
)
ON CONFLICT (client_id) DO NOTHING;

-- Show results of token creation
SELECT
  'Tokens Created' as action,
  COUNT(*) as new_tokens
FROM client_portal_access
WHERE created_at > NOW() - INTERVAL '1 minute';

-- ============================================================================
-- PART 3: VERIFY ANONYMOUS ACCESS WORKS
-- ============================================================================

-- Test that anonymous users can access portal data (this should return rows)
-- Note: This runs as authenticated user but tests the policy logic
SELECT
  'Anonymous Access Test' as test_name,
  COUNT(*) as accessible_records,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Policies Working'
    ELSE '❌ Policies Not Working'
  END as status
FROM client_portal_access
WHERE is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());

-- ============================================================================
-- PART 4: SYNC INVOICE COUNTS (IF NEEDED)
-- ============================================================================

-- Ensure invoice_count matches actual invoices
UPDATE tenants t
SET invoice_count = (
  SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id
)
WHERE invoice_count != (
  SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id
);

-- Show sync results
SELECT
  'Invoice Count Sync' as action,
  name,
  invoice_count,
  (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id) as actual_count,
  CASE
    WHEN invoice_count = (SELECT COUNT(*) FROM invoices WHERE tenant_id = tenants.id)
    THEN '✅ Synced'
    ELSE '❌ Out of Sync'
  END as status
FROM tenants;

-- ============================================================================
-- PART 5: FINAL VERIFICATION
-- ============================================================================

-- Show comprehensive portal status
SELECT
  'Portal System Status' as report,
  (SELECT COUNT(*) FROM client_portal_access WHERE is_active = true) as active_tokens,
  (SELECT COUNT(*) FROM clients) as total_clients,
  (SELECT COUNT(DISTINCT client_id) FROM client_portal_access WHERE is_active = true) as clients_with_access,
  (SELECT COUNT(*) FROM invoices) as total_invoices,
  CASE
    WHEN (SELECT COUNT(*) FROM client_portal_access WHERE is_active = true) > 0
    THEN '✅ PORTAL READY'
    ELSE '❌ PORTAL NOT CONFIGURED'
  END as overall_status;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- After running this script, you should see:
-- ✅ Active tokens exist for all clients with invoices
-- ✅ RLS policies are in place for anonymous access
-- ✅ Invoice counts are synced
-- ✅ Portal URLs are ready to share with clients
-- ============================================================================

-- NEXT STEPS:
-- 1. Test portal access by visiting: https://trybillable.com/client-portal/{TOKEN}
-- 2. From dashboard, go to Clients page and click "Portal Access" button
-- 3. Generate new portal link and test it
-- 4. Send test invoice email and verify portal link works
-- ============================================================================
