-- ============================================================================
-- DEBUG SCRIPT: Check Invoice Limits & Client Portal Tokens
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose both issues
-- ============================================================================

-- 1. Check if Stripe columns exist on tenants table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'invoice_count', 'invoice_limit')
ORDER BY ordinal_position;

-- 2. Check current tenant data (invoice counts and limits)
SELECT
  id,
  name,
  subscription_status,
  invoice_count,
  invoice_limit,
  stripe_customer_id,
  created_at
FROM tenants
ORDER BY created_at DESC;

-- 3. Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_invoice_created';

-- 4. Count actual invoices per tenant
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  t.invoice_count as stored_count,
  COUNT(i.id) as actual_invoice_count,
  t.invoice_limit,
  CASE
    WHEN COUNT(i.id) >= t.invoice_limit THEN '❌ LIMIT REACHED'
    ELSE '✅ Can create more'
  END as status
FROM tenants t
LEFT JOIN invoices i ON i.tenant_id = t.id
GROUP BY t.id, t.name, t.invoice_count, t.invoice_limit
ORDER BY t.created_at DESC;

-- 5. Check client portal access tokens
SELECT
  cpa.id,
  cpa.client_id,
  c.name as client_name,
  c.email as client_email,
  cpa.access_token,
  cpa.is_active,
  cpa.expires_at,
  cpa.last_accessed,
  CASE
    WHEN NOT cpa.is_active THEN '❌ INACTIVE'
    WHEN cpa.expires_at IS NOT NULL AND cpa.expires_at < NOW() THEN '❌ EXPIRED'
    ELSE '✅ VALID'
  END as token_status,
  cpa.created_at
FROM client_portal_access cpa
JOIN clients c ON c.id = cpa.client_id
ORDER BY cpa.created_at DESC
LIMIT 10;

-- 6. Check recent invoices and their clients
SELECT
  i.id as invoice_id,
  i.invoice_number,
  i.created_at as invoice_created,
  c.name as client_name,
  c.email as client_email,
  t.name as tenant_name,
  cpa.access_token,
  cpa.is_active as portal_active,
  cpa.expires_at as portal_expires
FROM invoices i
JOIN clients c ON c.id = i.client_id
JOIN tenants t ON t.id = i.tenant_id
LEFT JOIN client_portal_access cpa ON cpa.client_id = c.id
ORDER BY i.created_at DESC
LIMIT 10;

-- 7. Fix invoice_count if it's wrong (run this if counts don't match)
-- UNCOMMENT TO RUN:
-- UPDATE tenants t
-- SET invoice_count = (
--   SELECT COUNT(*) FROM invoices WHERE tenant_id = t.id
-- );

-- 8. Test if you can select from client_portal_access as anon (this tests RLS)
-- This should return rows if RLS is configured correctly
SET ROLE anon;
SELECT COUNT(*) as accessible_tokens FROM client_portal_access WHERE is_active = true;
RESET ROLE;
