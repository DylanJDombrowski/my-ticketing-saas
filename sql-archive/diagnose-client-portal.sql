-- Diagnostic script for client portal issues
-- Run this in Supabase Studio SQL Editor: http://127.0.0.1:54323

-- 1. Check if client_portal_access table has any data
SELECT
  'Portal Access Records' as check_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_records,
  COUNT(*) FILTER (WHERE expires_at > now()) as not_expired,
  COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > now())) as valid_records
FROM client_portal_access;

-- 2. Show all portal access records with details
SELECT
  id,
  client_id,
  LEFT(access_token, 10) || '...' as token_preview,
  is_active,
  expires_at,
  expires_at > now() as is_not_expired,
  last_accessed,
  created_at
FROM client_portal_access
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check RLS is enabled on required tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('client_portal_access', 'clients', 'tenants', 'invoices')
ORDER BY tablename;

-- 4. Check policies exist for anon role
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('client_portal_access', 'clients', 'tenants', 'invoices')
  AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;

-- 5. Test if anon can access a specific token (replace 'YOUR_TOKEN_HERE' with actual token)
-- SET ROLE anon;
-- SELECT * FROM client_portal_access WHERE access_token = 'YOUR_TOKEN_HERE';
-- RESET ROLE;
