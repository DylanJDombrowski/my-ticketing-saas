-- CRITICAL SECURITY FIX: Remove excessive anonymous permissions
-- This file addresses the critical security vulnerability where anonymous users
-- have ALL permissions on all tables, functions, and sequences.

-- CURRENT ISSUE: Lines 925-1006 in current_schema.sql grant ALL to anon role
-- RISK: Anonymous users can read/write any data, bypassing RLS policies

-- =============================================================================
-- STEP 1: REVOKE EXCESSIVE PERMISSIONS FROM ANONYMOUS ROLE
-- =============================================================================

-- Revoke all table permissions from anonymous users
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Revoke all function permissions from anonymous users
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Revoke all sequence permissions from anonymous users
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- =============================================================================
-- STEP 2: GRANT MINIMAL REQUIRED PERMISSIONS FOR AUTHENTICATION
-- =============================================================================

-- Anonymous users need these permissions for Supabase auth to work:
-- 1. Create new user profiles during registration
-- 2. Execute the new user trigger function

-- Grant INSERT permission for user registration only
GRANT INSERT ON TABLE public.profiles TO anon;

-- Grant EXECUTE on user creation functions (needed for registration)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_with_tenant(uuid, text, text, text, text) TO anon;

-- =============================================================================
-- STEP 3: VERIFY PERMISSIONS ARE CORRECT
-- =============================================================================

-- Query to verify anonymous permissions (run after applying this fix)
-- This should show minimal permissions only
/*
SELECT
    schemaname,
    tablename,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE grantee = 'anon'
  AND schemaname = 'public'
ORDER BY tablename, privilege_type;
*/

-- =============================================================================
-- STEP 4: ADD COMMENTS TO DOCUMENT SECURITY MODEL
-- =============================================================================

COMMENT ON ROLE anon IS 'Anonymous role with minimal permissions for user registration only. All data access controlled by RLS policies for authenticated users.';

-- =============================================================================
-- VERIFICATION QUERIES (for testing after deployment)
-- =============================================================================

-- Test 1: Verify anon cannot read tenant data
-- SELECT * FROM tenants; -- Should fail with permission denied

-- Test 2: Verify anon cannot read client data
-- SELECT * FROM clients; -- Should fail with permission denied

-- Test 3: Verify anon can insert profile (during registration)
-- This should work during the registration process only

-- =============================================================================
-- ROLLBACK PLAN (if issues occur)
-- =============================================================================

-- If this breaks authentication, temporarily restore with:
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
-- Then investigate which specific permissions are actually needed

-- =============================================================================
-- NOTES FOR DEVELOPERS
-- =============================================================================

-- 1. This fix follows the principle of least privilege
-- 2. RLS policies still provide the primary security layer
-- 3. Authenticated users maintain full access through RLS
-- 4. Test registration and login flows after applying
-- 5. Monitor for any authentication errors in production logs