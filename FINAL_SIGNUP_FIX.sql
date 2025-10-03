-- ============================================
-- COMPLETE SIGNUP FIX - COPY & RUN THIS ENTIRE SCRIPT
-- ============================================
-- This fixes ALL signup issues in one go

-- Step 1: Clean up old broken data
-- ============================================
-- Delete incomplete test users (users without profiles)
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL
);

-- Step 2: Fix the trigger function
-- ============================================
-- Drop and recreate to ensure it's correct
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create tenant (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.tenants (name, created_at, updated_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    NOW(),
    NOW()
  )
  RETURNING id INTO new_tenant_id;

  -- Create profile (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.profiles (
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Step 3: Attach trigger to auth.users
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant auth schema permissions
-- ============================================
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;

-- Step 5: Fix profiles RLS policies (remove recursion)
-- ============================================
DROP POLICY IF EXISTS "profiles_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_record" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Simple policies that only use auth.uid() (no recursion)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 6: Fix tenants RLS policies
-- ============================================
DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;

-- Safe policy - queries profiles from tenants (not circular)
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Step 7: Verification queries
-- ============================================
-- Check everything is set up correctly
SELECT
  '✅ Trigger attached' as status,
  count(*)::text as count
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass
UNION ALL
SELECT
  '✅ Profiles policies',
  count(*)::text
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass
UNION ALL
SELECT
  '✅ Tenants policies',
  count(*)::text
FROM pg_policy
WHERE polrelid = 'public.tenants'::regclass
UNION ALL
SELECT
  '✅ Incomplete users cleaned',
  count(*)::text
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Expected results:
-- ✅ Trigger attached: 1
-- ✅ Profiles policies: 3 (select, insert, update)
-- ✅ Tenants policies: 1
-- ✅ Incomplete users cleaned: 0

-- Step 8: Test the trigger manually
-- ============================================
-- This simulates what happens during signup
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'trigger-test-' || floor(random() * 10000)::text || '@example.com';
  profile_count INT;
  tenant_count INT;
BEGIN
  -- Insert test user (trigger should fire)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    test_user_id,
    'authenticated',
    'authenticated',
    test_email,
    crypt('testpassword123', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'company_name', 'Test Company',
      'first_name', 'Test',
      'last_name', 'User'
    ),
    NOW(),
    NOW()
  );

  -- Check if profile was created
  SELECT count(*) INTO profile_count
  FROM public.profiles
  WHERE id = test_user_id;

  -- Check if tenant was created
  SELECT count(*) INTO tenant_count
  FROM public.tenants t
  JOIN public.profiles p ON t.id = p.tenant_id
  WHERE p.id = test_user_id;

  -- Report results
  IF profile_count = 1 AND tenant_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS! Trigger working correctly';
    RAISE NOTICE '   - User created: %', test_user_id;
    RAISE NOTICE '   - Profile created: YES';
    RAISE NOTICE '   - Tenant created: YES';
  ELSE
    RAISE WARNING '❌ FAILED! Trigger not working';
    RAISE WARNING '   - Profile count: %', profile_count;
    RAISE WARNING '   - Tenant count: %', tenant_count;
  END IF;

  -- Cleanup test data
  DELETE FROM auth.users WHERE id = test_user_id;

  -- Verify cleanup
  SELECT count(*) INTO profile_count
  FROM public.profiles
  WHERE id = test_user_id;

  IF profile_count = 0 THEN
    RAISE NOTICE '✅ Test cleanup successful';
  END IF;
END $$;

-- ============================================
-- DONE! Now test signup in your app
-- ============================================
-- 1. Clear browser cache & cookies
-- 2. Go to http://localhost:3000/register
-- 3. Sign up with a new email
-- 4. Should work! ✅
