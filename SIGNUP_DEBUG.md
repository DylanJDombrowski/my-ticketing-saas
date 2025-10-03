# Signup Debug & Fix Guide

## Current Issue
After registering, you get a success message but are redirected back to signup/login screen in a loop.

## Root Cause
The `handle_new_user()` trigger isn't attached to the `auth.users` table, so the profile and tenant aren't being created automatically.

---

## ✅ IMMEDIATE FIX (Do This Now!)

### Step 1: Apply the Trigger Migration

**Go to Supabase Dashboard:**
1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click "New query"
5. Paste this SQL:

```sql
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
```

6. Click **"Run"** (or press Ctrl+Enter)
7. Verify you see: **"Success. No rows returned"**

### Step 2: Verify the Trigger is Working

Run this query in SQL Editor to check:

```sql
-- Check if trigger exists
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected Result:** 1 row showing:
- trigger_name: `on_auth_user_created`
- event_object_table: `users`
- action_statement: `EXECUTE FUNCTION public.handle_new_user()`

If you see 0 rows, the trigger wasn't created. Check for errors.

### Step 3: Clear Existing Test Data

Delete any incomplete test accounts:

```sql
-- ONLY RUN THIS IN DEVELOPMENT!
-- Find incomplete users (users without profiles)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- If you see test accounts, delete them:
DELETE FROM auth.users
WHERE email LIKE 'test%@example.com'; -- adjust email pattern as needed
```

### Step 4: Test Signup Again

1. **Clear browser cache and cookies** (important!)
2. Go to http://localhost:3000/register
3. Fill out the form:
   - Company: "Test Company"
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "test@example.com"
   - Password: "password123"
4. Click "Create Account"
5. **Expected:** Should redirect to `/dashboard` ✅

---

## 🔍 How to Debug If It Still Fails

### Check 1: Is the trigger firing?

Run this after attempting signup:

```sql
-- Check if user was created
SELECT id, email, raw_user_meta_data, created_at
FROM auth.users
WHERE email = 'test@example.com';

-- Check if profile was created
SELECT id, tenant_id, email, first_name, last_name
FROM public.profiles
WHERE email = 'test@example.com';

-- Check if tenant was created
SELECT t.id, t.name, t.created_at
FROM public.tenants t
JOIN public.profiles p ON p.tenant_id = t.id
WHERE p.email = 'test@example.com';
```

**What to expect:**
1. ✅ User exists in `auth.users`
2. ✅ Profile exists in `public.profiles` with `tenant_id`
3. ✅ Tenant exists in `public.tenants`

**If user exists but no profile:**
- Trigger isn't firing
- Check trigger is attached (see Step 2)
- Check for errors in Supabase logs (Dashboard > Logs)

**If profile exists but no tenant_id:**
- Trigger partially failed
- Check `handle_new_user()` function for errors
- Verify RLS policies allow SECURITY DEFINER to insert

### Check 2: View Browser Console Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Attempt signup
4. Look for errors like:
   - `Profile creation failed`
   - `row-level security policy`
   - `foreign key violation`

### Check 3: Test the Trigger Function Manually

```sql
-- Test the handle_new_user function directly
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Manually insert test user (simulating trigger)
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    test_user_id,
    'manual-test@example.com',
    '{"company_name": "Test Co", "first_name": "Jane", "last_name": "Smith"}'::jsonb
  );

  -- Check if trigger created profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'SUCCESS: Profile created!';
  ELSE
    RAISE NOTICE 'FAILED: No profile created';
  END IF;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
END $$;
```

Expected: `SUCCESS: Profile created!`

---

## 🛠 Alternative Fix: Manual Profile Creation

If the trigger approach keeps failing, you can fall back to using a Supabase Edge Function or API route:

### Option 1: Use API Route (Recommended if trigger fails)

Create `src/app/api/auth/signup/route.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Admin client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, tenantName, firstName, lastName } = await req.json();

    // Create user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) throw userError;

    // Create tenant (bypasses RLS)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ name: tenantName })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Create profile (bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        tenant_id: tenant.id,
        email,
        first_name: firstName,
        last_name: lastName,
      });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

Then update `src/stores/auth.ts` to call this API instead.

---

## 📋 Checklist

Before declaring victory, verify:

- [ ] Trigger `on_auth_user_created` exists on `auth.users` table
- [ ] Function `handle_new_user()` exists and has `SECURITY DEFINER`
- [ ] Cleared browser cache/cookies
- [ ] Deleted incomplete test users from database
- [ ] Signup creates user, profile, and tenant in one go
- [ ] Profile has `tenant_id` populated
- [ ] Redirects to `/dashboard` after signup
- [ ] Dashboard loads without redirect loop

---

## 🎯 Expected Flow

1. User submits signup form
2. Frontend calls `supabase.auth.signUp()` with metadata
3. Supabase creates user in `auth.users`
4. **Trigger fires automatically:** `on_auth_user_created`
5. Trigger calls `handle_new_user()`
6. Function creates:
   - Tenant (using `company_name` from metadata)
   - Profile (linked to tenant)
7. Frontend polls for profile (with retry logic)
8. Once profile exists with `tenant_id`, set state
9. Redirect to `/dashboard`
10. AuthGuard allows access ✅

---

## 🚨 Common Mistakes

1. **Forgot to run the trigger SQL** - Most common!
2. **Browser cache has old auth state** - Clear it!
3. **Email confirmation is enabled** - Disable in Supabase Auth settings for testing
4. **Service role key not set** - Check `.env.local`
5. **Old test users without profiles** - Delete them!

---

## ✅ Success Criteria

You know it's working when:
1. Signup form submits successfully
2. No errors in browser console
3. Success toast appears
4. Redirects to `/dashboard`
5. Dashboard shows your data (not redirect loop)
6. Can sign out and sign back in
7. Can create clients, tickets, etc.

---

## 💡 Pro Tip

Add this to your SQL Editor to quickly check auth state:

```sql
-- Quick debug query
SELECT
  u.id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.tenant_id,
  t.name as tenant_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.tenants t ON p.tenant_id = t.id
ORDER BY u.created_at DESC
LIMIT 10;
```

This shows your last 10 signups and whether they have profiles/tenants.

---

**After applying the trigger SQL, signup should work perfectly!** 🎉

If you still have issues after following this guide, share the error from browser console.
