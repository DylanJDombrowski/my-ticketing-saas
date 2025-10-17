# 🚀 Client Portal - Quick Start (5 Minutes)

## What You Need to Do

Your client portal is **already built** and just needs to be activated. Follow these 3 simple steps:

---

## Step 1: Run Database Setup (2 minutes)

### Open Supabase SQL Editor
🔗 **URL:** https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql

### Paste and Run This Script
📄 **File:** `CLIENT_PORTAL_DIAGNOSTIC.sql`

**What it does:**
- ✅ Creates portal access tokens for your existing clients
- ✅ Verifies RLS policies are in place
- ✅ Syncs invoice counts
- ✅ Shows you portal URLs for each client

**Expected Output:**
```
✅ PORTAL READY
Active tokens: N
Clients with access: N
```

---

## Step 2: Test Portal Access (2 minutes)

### Option A: From Dashboard (Recommended)

1. **Go to:** https://trybillable.com/dashboard/clients
2. **Find any client** in the list
3. **Click:** "Portal Access" button (shield icon)
4. **Click:** "Generate Portal Access"
5. **Copy** the portal URL
6. **Open** in incognito/private window

### Option B: From Database Query

After running Step 1, you'll see portal URLs like:
```
https://trybillable.com/client-portal/AbCd1234XyZ...
```

Copy any URL and open it in an incognito window.

### What You Should See:
- ✅ Welcome message with client name
- ✅ Invoice statistics (Total, Paid, Pending, Overdue)
- ✅ List of all invoices
- ✅ View/Download buttons work

---

## Step 3: Send Test Email (1 minute)

### Test the Email Integration

1. **Go to:** https://trybillable.com/dashboard/invoices
2. **Find any invoice** with a client email
3. **Click:** "Send" button
4. **Check** your email inbox
5. **Click:** "View Client Portal" link in email
6. **Verify** portal loads correctly

### What You Should See in Email:
- ✅ "View Client Portal" button
- ✅ Portal link in format: `/client-portal/{TOKEN}`
- ✅ Link works when clicked

---

## ✅ Success Checklist

After completing the above steps, you should have:

- [x] Portal tokens created for all clients with invoices
- [x] Portal accessible via unique URLs
- [x] Clients can view their invoices without logging in
- [x] PDFs downloadable from portal
- [x] Email integration working (portal links in invoice emails)

---

## 🎯 Using the Portal Daily

### From Dashboard → Clients Page:

**To give a client portal access:**
1. Click "Portal Access" button on any client
2. Set expiration (default: 30 days)
3. Click "Generate Portal Access"
4. Either:
   - **Copy link** and share it securely
   - **Email to client** (automated email with portal link)

**Portal URL format:**
```
https://trybillable.com/client-portal/{SECURE_TOKEN}
```

### From Invoice Emails (Automatic):

When you send an invoice via email:
- Portal token is **automatically created** (if client doesn't have one)
- Email includes **"View Client Portal"** button
- Client can access all their invoices, not just the one emailed

---

## 🔒 Security Features

Your portal is **secure by default**:

✅ **Token-based access** - No passwords needed
✅ **Unique per client** - Each client has their own token
✅ **Automatic expiration** - Tokens expire after 30-90 days
✅ **Row-level security** - Clients can only see their own data
✅ **Tenant isolation** - Database enforces data separation
✅ **HTTPS only** - All traffic encrypted

---

## ⚠️ Common Issues & Quick Fixes

### "Access Denied" Error

**Run this SQL:**
```sql
SELECT access_token, is_active, expires_at
FROM client_portal_access
WHERE access_token = 'YOUR_TOKEN';
```

**Fix:**
- If `is_active = false`: Token was deactivated
- If `expires_at < NOW()`: Token expired
- Solution: Generate new token from dashboard

### Portal Link Not in Email

**Check:**
1. Email was sent successfully (check inbox/spam)
2. Token was created (run diagnostic script)
3. RLS policies are in place (re-run setup script)

**Fix:**
- Resend invoice email
- Or manually generate token from dashboard

### Can't Generate Portal Access

**Check:**
1. You're logged in to dashboard
2. Client belongs to your tenant
3. RLS policies exist

**Fix:**
- Re-run `CLIENT_PORTAL_DIAGNOSTIC.sql`
- Check browser console for errors

---

## 📊 Monitor Portal Usage

### Check Active Portals

**Run in Supabase:**
```sql
SELECT
  c.name,
  c.email,
  cpa.last_accessed,
  cpa.expires_at,
  'https://trybillable.com/client-portal/' || cpa.access_token as portal_url
FROM client_portal_access cpa
JOIN clients c ON c.id = cpa.client_id
WHERE cpa.is_active = true
ORDER BY cpa.last_accessed DESC NULLS LAST;
```

### See Which Clients Accessed Recently

```sql
SELECT
  c.name,
  cpa.last_accessed,
  CASE
    WHEN cpa.last_accessed > NOW() - INTERVAL '7 days' THEN 'Active'
    WHEN cpa.last_accessed > NOW() - INTERVAL '30 days' THEN 'Recent'
    ELSE 'Inactive'
  END as activity
FROM client_portal_access cpa
JOIN clients c ON c.id = cpa.client_id
WHERE cpa.is_active = true
ORDER BY cpa.last_accessed DESC;
```

---

## 📚 Full Documentation

For detailed information, see:

- **📖 Complete Guide:** `CLIENT_PORTAL_GUIDE.md` (comprehensive documentation)
- **🔧 Diagnostic Tool:** `CLIENT_PORTAL_DIAGNOSTIC.sql` (database checks)
- **✅ Testing Guide:** `TESTING_CHECKLIST.md` (full test suite)
- **🔨 Database Fixes:** `FIX_BOTH_ISSUES_NOW.sql` (general fixes)

---

## 🆘 Need Help?

### Quick Diagnostics

**Run this SQL to check everything:**
```sql
SELECT
  'Portal Status' as check,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(DISTINCT client_id) as clients,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Working'
    ELSE '❌ Not Setup'
  END as status
FROM client_portal_access;
```

### Check Logs

**Browser Console:**
- Open portal in Chrome/Firefox
- Press F12 → Console tab
- Look for errors

**Server Logs:**
- Check Supabase logs for API errors
- Check function errors in Supabase dashboard

---

## 🎉 You're Ready!

Your client portal is now functional. Clients can:
- Access invoices 24/7
- Download PDFs
- See payment status
- No login required

**Next Steps:**
1. ✅ Run Step 1 (database setup)
2. ✅ Test portal access (Step 2)
3. ✅ Send test email (Step 3)
4. 🎊 Start sharing portal links with clients!

---

**Questions?** Check `CLIENT_PORTAL_GUIDE.md` for detailed answers.

**Last Updated:** October 17, 2025
