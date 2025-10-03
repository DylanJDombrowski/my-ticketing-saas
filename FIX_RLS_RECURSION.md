# Fix RLS Infinite Recursion Error

## 🚨 ERROR
```
infinite recursion detected in policy for relation "profiles"
POST /auth/v1/signup 500 (Internal Server Error)
```

## 🔍 ROOT CAUSE

The `profiles` RLS policy was querying the `profiles` table within itself:

```sql
-- BAD (causes infinite recursion):
CREATE POLICY "profiles_own_tenant" ON profiles
  USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()  -- ❌ Queries profiles within profiles!
  ));
```

When checking RLS, Postgres runs the policy → which queries profiles → which triggers RLS again → infinite loop → 💥

## ✅ THE FIX (RUN THIS NOW!)

### Step 1: Run in Supabase SQL Editor

```sql
-- Drop ALL existing problematic policies on profiles
DROP POLICY IF EXISTS "profiles_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_record" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Simple policy: Users can only access their own profile record
-- Safe because it ONLY uses auth.uid(), no subqueries
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### Step 2: Verify No Recursion

Run this to check the policy:

```sql
-- Should show 2 policies with simple conditions (no subqueries on profiles)
SELECT
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass;
```

**Expected result:**
- `profiles_select_own`: `(id = auth.uid())`
- `profiles_update_own`: `(id = auth.uid())`

**NO subqueries like:** `(tenant_id = (SELECT ...))` ❌

### Step 3: Test Signup Again

1. **Clear browser completely:**
   - Close all tabs
   - Clear cookies & cache (Ctrl+Shift+Delete)
   - Restart browser

2. **Delete test users in Supabase:**
   ```sql
   DELETE FROM auth.users WHERE email LIKE '%test%';
   ```

3. **Try signup:**
   - Go to http://localhost:3000/register
   - Sign up with new email
   - Should work! ✅

---

## 🛠 COMPLETE FIX (All 3 Issues)

You actually have **3 separate issues** that all need fixing:

### Issue 1: ✅ Trigger Not Attached
**Symptom:** Profile not created on signup

**Fix:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
```

### Issue 2: ✅ RLS Infinite Recursion (THIS ONE!)
**Symptom:** `infinite recursion detected in policy for relation "profiles"`

**Fix:** (See Step 1 above)

### Issue 3: ✅ Tenant RLS Policy
**Check this one too:**

```sql
-- Check if tenants policy also has recursion
SELECT polname, pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'public.tenants'::regclass;
```

If you see a subquery on profiles, fix it:
```sql
DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;

CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Note: This is OK because we're querying profiles from tenants policy (not circular)
```

---

## 🧪 COMPLETE SQL FIX (All at Once)

Run this entire script in Supabase SQL Editor:

```sql
-- 1. Fix trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix profiles RLS (remove recursion)
DROP POLICY IF EXISTS "profiles_own_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_record" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Fix tenants RLS (use safe subquery)
DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;

CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;

-- 5. Verify
SELECT 'Trigger exists:' as check, count(*) as result
FROM pg_trigger WHERE tgname = 'on_auth_user_created'
UNION ALL
SELECT 'Profiles policies:', count(*)
FROM pg_policy WHERE polrelid = 'public.profiles'::regclass
UNION ALL
SELECT 'Tenants policies:', count(*)
FROM pg_policy WHERE polrelid = 'public.tenants'::regclass;
```

**Expected verification results:**
- Trigger exists: 1
- Profiles policies: 2
- Tenants policies: 1

---

## 🎯 Why This Works

### Bad Pattern (Causes Recursion):
```sql
-- ❌ NEVER DO THIS
CREATE POLICY ON profiles USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE ...) -- Queries profiles!
);
```

### Good Pattern (No Recursion):
```sql
-- ✅ SAFE - Only uses auth.uid()
CREATE POLICY ON profiles USING (
  id = auth.uid() -- Direct comparison, no table query
);

-- ✅ SAFE - Queries DIFFERENT table
CREATE POLICY ON tenants USING (
  id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

**Rule:** Never query the same table within its own RLS policy!

---

## ✅ Test Checklist

After running the fix, verify:

- [ ] Trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
- [ ] No recursion in profiles policy (check using expressions above)
- [ ] Cleared browser cache/cookies
- [ ] Deleted test users from auth.users
- [ ] Signup works without 500 error
- [ ] Profile is created with tenant_id
- [ ] Redirects to dashboard
- [ ] Dashboard loads (no redirect loop)

---

## 🐛 Still Broken?

If signup still fails:

1. **Check Supabase logs:**
   - Dashboard > Logs > Postgres Logs
   - Look for detailed error

2. **Test trigger manually:**
   ```sql
   -- Insert test user and check if trigger fires
   INSERT INTO auth.users (id, email, raw_user_meta_data)
   VALUES (
     gen_random_uuid(),
     'manual-test@test.com',
     '{"company_name": "Test Co"}'::jsonb
   )
   RETURNING id;

   -- Check if profile was created
   SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 1;
   ```

3. **Check browser console:**
   - Look for specific error message
   - Share the error if still stuck

---

## 📋 Summary

**3 fixes needed:**
1. ✅ Attach `on_auth_user_created` trigger to `auth.users`
2. ✅ Remove infinite recursion from `profiles` RLS policy
3. ✅ Verify `tenants` RLS policy is safe

**Run the "Complete SQL Fix" script above and you're done!** 🎉

---

*Migration file: [supabase/migrations/20251002000003_fix_profiles_rls_infinite_recursion.sql](supabase/migrations/20251002000003_fix_profiles_rls_infinite_recursion.sql)*
