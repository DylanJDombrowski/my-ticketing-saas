# 🚀 Apply Migration - SIMPLE VERSION

**Good news:** Your schema.sql already has most payment fields! This migration just adds what's missing.

---

## ✅ What This Migration Does

1. Adds Stripe Connect fields to `profiles` table
2. Creates `payment_methods` table (for manual payment options)
3. Adds helper functions for payment tracking
4. Creates indexes for performance

**Note:** Invoice payment fields (`sent_at`, `paid_at`, `amount_paid`, etc.) already exist in your schema! ✅

---

## 📋 Step-by-Step Instructions (5 minutes)

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run the Migration

1. Click "New Query"
2. Open this file: `supabase/migrations/20251003000002_add_missing_payment_tables.sql`
3. Copy **ALL** contents (Cmd+A, Cmd+C)
4. Paste into SQL Editor
5. Click "Run" (or press Cmd+Enter)

### Step 3: Verify Success

You should see:
```
✅ Payment features migration completed!
   - Added Stripe Connect fields to profiles
   - Created payment_methods table
   - Added payment tracking functions
   - Created indexes for performance

✅ Ready to ship! Invoice fields already exist in your schema.
```

---

## ✅ Quick Test

Run this to verify the migration worked:

```sql
-- Check if payment_methods table was created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'payment_methods';
-- Should return 1 row

-- Check if Stripe fields were added to profiles
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('stripe_account_id', 'default_payment_instructions');
-- Should return 2 rows

-- Check if functions were created
SELECT proname FROM pg_proc
WHERE proname IN ('mark_overdue_invoices', 'update_invoice_payment');
-- Should return 2 rows
```

---

## 🎉 That's It!

Your database is now ready for:
- ✅ Sending invoices
- ✅ Manual payment tracking
- ✅ Stripe Connect (when you add it later)

**Next:** Test the app!

```bash
npm run dev
# Create invoice → Send → Mark as Paid
```

---

## 🐛 If You Get Errors

**"relation already exists"**
- Safe to ignore - table already exists

**"column already exists"**
- Safe to ignore - column already exists

**"permission denied"**
- Make sure you're project owner
- Try running in Supabase dashboard instead of CLI

---

## ✅ You're Done!

The migration is complete. Your app is ready to ship!

**Next steps:**
1. Test invoice workflow
2. Invite beta users
3. Get feedback
4. Add Stripe Connect in Week 2

🚀 **Let's ship it!**
