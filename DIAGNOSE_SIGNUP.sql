-- ============================================
-- DIAGNOSTIC QUERY - Run this to see what's wrong
-- ============================================

-- 1. Check if trigger exists and is attached
SELECT
  'TRIGGER CHECK' as test,
  CASE
    WHEN count(*) = 1 THEN '✅ Trigger attached correctly'
    ELSE '❌ Trigger missing or not attached'
  END as result
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;

-- 2. Check trigger function exists
SELECT
  'FUNCTION CHECK' as test,
  CASE
    WHEN count(*) = 1 THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as result
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check most recent users and their profiles/tenants
SELECT
  '== RECENT SIGNUPS ==' as section,
  u.email,
  u.created_at::timestamp(0),
  CASE WHEN p.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile,
  CASE WHEN p.tenant_id IS NOT NULL THEN '✅' ELSE '❌' END as has_tenant,
  t.name as tenant_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.tenants t ON p.tenant_id = t.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 4. Check for incomplete users
SELECT
  'INCOMPLETE USERS' as test,
  count(*) as count,
  CASE
    WHEN count(*) = 0 THEN '✅ No incomplete users'
    ELSE '❌ Found ' || count(*) || ' users without profiles'
  END as result
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 5. Check for profiles without tenants
SELECT
  'PROFILES WITHOUT TENANTS' as test,
  count(*) as count,
  CASE
    WHEN count(*) = 0 THEN '✅ All profiles have tenants'
    ELSE '❌ Found ' || count(*) || ' profiles without tenant_id'
  END as result
FROM public.profiles
WHERE tenant_id IS NULL;

-- 6. View the actual trigger definition
SELECT
  'TRIGGER DEFINITION' as info,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 7. Check RLS policies on profiles
SELECT
  'PROFILES RLS POLICIES' as table_name,
  polname as policy_name,
  CASE
    WHEN polcmd = 'r' THEN 'SELECT'
    WHEN polcmd = 'a' THEN 'INSERT'
    WHEN polcmd = 'w' THEN 'UPDATE'
    WHEN polcmd = 'd' THEN 'DELETE'
    WHEN polcmd = '*' THEN 'ALL'
  END as command,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass
ORDER BY polname;

-- 8. Check RLS policies on tenants
SELECT
  'TENANTS RLS POLICIES' as table_name,
  polname as policy_name,
  CASE
    WHEN polcmd = 'r' THEN 'SELECT'
    WHEN polcmd = 'a' THEN 'INSERT'
    WHEN polcmd = 'w' THEN 'UPDATE'
    WHEN polcmd = 'd' THEN 'DELETE'
    WHEN polcmd = '*' THEN 'ALL'
  END as command,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'public.tenants'::regclass
ORDER BY polname;

-- ============================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Look at the results:
--    - All checks should be ✅
--    - Recent signups should show tenant names
--    - No incomplete users or profiles
-- 3. If you see ❌, the issue is identified
-- 4. Share the results if you need help
-- ============================================
