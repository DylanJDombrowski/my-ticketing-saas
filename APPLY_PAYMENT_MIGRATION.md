# Apply Payment Features Migration

**Created:** 2025-10-03
**Migration File:** `supabase/migrations/20251003000001_add_payment_features.sql`

---

## What This Migration Does

Adds full payment support to your SaaS:

1. ✅ **Stripe Connect** - Users connect their own Stripe accounts
2. ✅ **Manual Payments** - Bank transfer, Venmo, PayPal instructions
3. ✅ **Partial Payments** - Track when clients pay in installments
4. ✅ **Invoice Workflow** - Sent status, due dates, overdue tracking
5. ✅ **Payment Tracking** - Who paid, when, how much

---

## How to Apply (2 Options)

### Option A: Supabase Dashboard (Recommended - Safer)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste Migration:**
   - Open file: `supabase/migrations/20251003000001_add_payment_features.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into SQL Editor

4. **Run Migration:**
   - Click "Run" button (or Cmd+Enter)
   - Wait for success message

5. **Verify Success:**
   - You should see: "Payment features migration completed successfully!"
   - Check for any errors in output

---

### Option B: Supabase CLI (Advanced)

```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

---

## What Gets Added to Database

### New Columns on `profiles` table:
- `stripe_account_id` - User's Stripe Connect account
- `stripe_account_status` - Status: none, pending, active, restricted
- `stripe_onboarding_completed` - Whether setup is done
- `default_payment_instructions` - Default manual payment text

### New Columns on `invoices` table:
- `payment_method` - stripe, manual, wire, check, crypto, other
- `payment_instructions` - Specific instructions for this invoice
- `stripe_payment_intent_id` - Stripe payment ID
- `stripe_checkout_session_id` - Stripe checkout session
- `sent_at` - When invoice was emailed to client
- `sent_to_email` - Client email it was sent to
- `paid_at` - When fully paid
- `amount_paid` - Amount paid so far (for partial payments)

### New Table: `payment_methods`
Stores user's manual payment options:
- Bank account details
- Venmo username
- PayPal email
- Crypto wallet address
- Check mailing address
- etc.

### New Table: `stripe_connect_accounts`
Tracks Stripe Connect account status:
- Account ID
- Onboarding status
- Charges enabled?
- Payouts enabled?
- Last sync time

### New Functions:
- `mark_overdue_invoices()` - Auto-marks invoices as overdue
- `update_invoice_payment()` - Handles partial/full payments

### New Invoice Status:
- `partial` - Added to existing: draft, sent, paid, overdue, cancelled

---

## After Migration - Test It

Run these queries to verify:

```sql
-- Check if new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'invoices'
AND column_name IN ('payment_method', 'sent_at', 'amount_paid');
-- Should return 3 rows

-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('payment_methods', 'stripe_connect_accounts');
-- Should return 2 rows

-- Check if 'partial' status was added
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'invoice_status'::regtype
ORDER BY enumlabel;
-- Should include: cancelled, draft, overdue, paid, partial, sent

-- Test the payment update function
SELECT update_invoice_payment(
    'test-uuid'::uuid,  -- Replace with real invoice ID
    100.00,
    'stripe',
    'pi_test123'
);
```

---

## Rollback (If Something Goes Wrong)

If you need to undo this migration:

```sql
-- Remove new columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS stripe_account_id,
DROP COLUMN IF EXISTS stripe_account_status,
DROP COLUMN IF EXISTS stripe_onboarding_completed,
DROP COLUMN IF EXISTS default_payment_instructions;

ALTER TABLE invoices
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS payment_instructions,
DROP COLUMN IF EXISTS stripe_payment_intent_id,
DROP COLUMN IF EXISTS stripe_checkout_session_id,
DROP COLUMN IF EXISTS sent_at,
DROP COLUMN IF EXISTS sent_to_email,
DROP COLUMN IF EXISTS paid_at,
DROP COLUMN IF EXISTS amount_paid;

-- Drop new tables
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS stripe_connect_accounts;

-- Drop functions
DROP FUNCTION IF EXISTS mark_overdue_invoices();
DROP FUNCTION IF EXISTS update_invoice_payment(UUID, NUMERIC, VARCHAR, VARCHAR);
```

---

## Next Steps After Migration

1. ✅ Migration applied
2. Update TypeScript types to include new fields
3. Create Stripe Connect settings page
4. Add "Send Invoice" button
5. Add payment instructions UI
6. Build Stripe OAuth flow
7. Test end-to-end payment

---

## Need Help?

If the migration fails:
1. Check error message in Supabase dashboard
2. Common issues:
   - Table doesn't exist (check table names)
   - Column already exists (safe to ignore)
   - Permission errors (check you're project owner)
3. Copy error message and we'll debug together

---

**Ready to apply? Go to Option A above!** ✅
