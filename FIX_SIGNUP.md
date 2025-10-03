# Fix Signup RLS Error

## Problem
Getting error: "new row violates row-level security policy for table 'tenants'" when signing up.

## Root Cause
The signup flow was trying to manually create a tenant, but RLS policies block unauthenticated users from inserting into `tenants` table.

## Solution
Use Supabase's built-in `handle_new_user()` trigger that runs with elevated privileges.

---

## ✅ What I Fixed

### 1. Updated Auth Store ([src/stores/auth.ts](src/stores/auth.ts))
Changed signup to pass metadata to Supabase, letting the trigger handle tenant/profile creation:

```typescript
// BEFORE (manual insert - violates RLS):
const { data: tenant } = await supabase.from("tenants").insert({ name: tenantName })

// AFTER (use trigger - bypasses RLS):
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      company_name: tenantName,
      first_name: firstName,
      last_name: lastName,
    },
  },
});
```

### 2. Created Migration to Attach Trigger
Created: [supabase/migrations/20251002000002_fix_signup_trigger.sql](supabase/migrations/20251002000002_fix_signup_trigger.sql)

This migration:
- Attaches `handle_new_user()` trigger to `auth.users` table
- Runs automatically after new user creation
- Uses `SECURITY DEFINER` to bypass RLS

---

## 🚀 Apply the Fix

### Option 1: Supabase Dashboard (Quick)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) > SQL Editor
2. Copy and paste this SQL:

```sql
-- Fix signup by attaching handle_new_user trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
```

3. Click "Run"
4. Verify no errors

### Option 2: Supabase CLI (If installed)

```bash
supabase db push
```

---

## ✅ Test the Fix

1. **Clear browser cache** and cookies (important!)
2. Go to your signup page: http://localhost:3000/register
3. Fill out the form:
   - Company Name: "Test Company"
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "test@example.com"
   - Password: "password123"
4. Click "Create Account"
5. Should redirect to dashboard ✅

---

## 🔍 How It Works Now

**Signup Flow:**
1. User submits registration form
2. Frontend calls `supabase.auth.signUp()` with metadata
3. Supabase creates auth user
4. **Trigger fires automatically** (runs with elevated permissions)
5. Trigger creates:
   - New tenant (using `company_name` from metadata)
   - New profile (linked to tenant, using `first_name` and `last_name`)
6. User is authenticated and redirected to dashboard

**Key Benefits:**
- ✅ Bypasses RLS (trigger runs as SECURITY DEFINER)
- ✅ Atomic operation (all or nothing)
- ✅ No race conditions
- ✅ Works with email confirmation enabled

---

## 🐛 Troubleshooting

### Still getting RLS error?
1. Verify trigger is attached:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   Should return 1 row.

2. Check trigger function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```
   Should return 1 row.

3. Verify permissions:
   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'users' AND table_schema = 'auth';
   ```
   Should show grants to `service_role`.

### Profile not loading after signup?
- Check browser console for errors
- Verify `profiles` table has RLS policies allowing SELECT for own record
- Try signing out and back in

### Email confirmation issues?
If you have email confirmation enabled in Supabase:
1. Go to Authentication > Providers > Email
2. Disable "Confirm email" for testing
3. Or check spam folder for confirmation email

---

## 📝 Notes

- The trigger uses `SECURITY DEFINER` to run with elevated privileges
- This is safe because the trigger is controlled by you (not user input)
- The trigger creates tenant name from `raw_user_meta_data->>'company_name'`
- If no company name provided, defaults to "My Company"

---

## ✅ You're Done!

After applying the migration, signup should work perfectly. Test it and you're ready to move on to Stripe setup!

Next: [STRIPE_SETUP.md](STRIPE_SETUP.md)
