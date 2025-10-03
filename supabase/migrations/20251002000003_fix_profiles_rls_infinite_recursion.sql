-- Fix infinite recursion in profiles RLS policy
-- The problem: Old policy queried profiles table WITHIN profiles policy → infinite loop
-- The solution: Use ONLY auth.uid() which doesn't trigger RLS

-- Drop ALL existing problematic policies on profiles
DROP POLICY IF EXISTS "profiles_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_record" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Simple policy: Users can only access their own profile record
-- This is safe because it ONLY uses auth.uid(), no subqueries on profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: INSERT/DELETE are handled by the handle_new_user trigger (SECURITY DEFINER)
-- We don't need INSERT policy because users don't manually insert profiles
-- We don't need DELETE policy because users shouldn't delete their own profiles

COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 'Users can view their own profile (no recursion)';
COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 'Users can update their own profile (no recursion)';
