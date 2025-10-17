# 🌐 Client Portal - Complete Setup & Usage Guide

## Overview

The Client Portal allows your clients to:
- ✅ View all their invoices in one place
- ✅ Download invoice PDFs
- ✅ See payment status and history
- ✅ Access their account 24/7 without login credentials
- ✅ View invoice statistics (total, paid, pending, overdue)

## Current Status

Based on your codebase analysis:

### ✅ Already Implemented
- Client portal page: `/client-portal/[token]/page.tsx`
- API routes for portal access: `/api/client-portal/[token]/route.ts`
- Token generation API: `/api/client-portal/generate/route.ts`
- ClientPortalManager component (integrated in Clients page)
- ClientPortalLayout component (portal UI wrapper)
- Database table: `client_portal_access`
- RLS policies for anonymous access
- Email integration (portal links in invoice emails)

### ⚠️ Setup Required
1. Run diagnostic SQL script to verify database state
2. Create portal tokens for existing clients
3. Test portal access flow

---

## Quick Start Guide

### Step 1: Run Diagnostic Script

**Where:** Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql

**What to do:**
1. Open `CLIENT_PORTAL_DIAGNOSTIC.sql`
2. Copy entire contents
3. Paste in Supabase SQL Editor
4. Click "Run"

**Expected Results:**
```
Client Portal Access Table
- Total records: N
- Active tokens: N
- Clients with access: N

RLS Policies for Client Portal
- Policy count: 5+
- Policies: [authenticated_can_manage_portal_access, client_portal_access_anon_select, ...]

Portal System Status
- Overall status: ✅ PORTAL READY
```

---

## Using the Client Portal

### Method 1: Generate Portal Access from Dashboard

**From the Clients Page:**

1. Navigate to **Dashboard → Clients**
2. Find the client you want to give portal access
3. Click the **"Portal Access"** button (shield icon)
4. Set access duration (default: 30 days)
5. Click **"Generate Portal Access"**

**What You Get:**
- Secure portal URL: `https://trybillable.com/client-portal/{TOKEN}`
- Access token (32-character random string)
- Expiration date
- Copy/share options

**Actions Available:**
- 📋 **Copy to Clipboard** - Copy the portal URL
- 🔗 **Open in New Tab** - Preview the portal yourself
- 📧 **Email to Client** - Send automated email with portal link

### Method 2: Portal Links in Invoice Emails

**Automatic Portal Links:**

When you send an invoice via email, the system automatically:
1. Creates a portal access token for that client (if they don't have one)
2. Includes portal link in the email
3. Links are valid for 90 days by default

**Email Template Includes:**
- "View Client Portal" button with secure link
- "Pay This Invoice" button (if payment methods configured)
- Full invoice details

---

## Portal Features (Client View)

When clients access their portal, they see:

### Dashboard Section
- **Welcome message** with their name
- **Last accessed** timestamp
- **Access expiration** date (with warning if expiring soon)

### Statistics Cards
- 💰 **Total Invoiced** - Sum of all invoices
- ✅ **Paid** - Total paid amount (green)
- ⏱️ **Pending** - Unpaid invoices (blue)
- ⚠️ **Overdue** - Past due invoices (red)

### Invoices Table
- Invoice number
- Amount
- Status (with color-coded badges)
- Due date
- Date issued
- Actions:
  - 👁️ **View** - Open PDF in new tab
  - ⬇️ **Download** - Save PDF to device

### Sidebar Information
- Client contact details
- Portal access information
- Support contact (your tenant email)

---

## Security Features

### Token-Based Authentication
- **No login required** - Clients access via unique URL
- **Cryptographically secure tokens** - 32 bytes, base64url encoded
- **Automatic expiration** - Configurable (default 30-90 days)
- **One token per client** - Can be regenerated anytime

### Row Level Security (RLS)
- Clients can **only** see their own data
- Anonymous access restricted to portal tables only
- Tenant isolation enforced at database level
- No cross-client data leakage possible

### Access Control
- Tokens can be deactivated instantly
- Expired tokens show "Access Denied" message
- Last accessed timestamp tracked
- Support for token refresh/regeneration

---

## Configuration Options

### Default Settings (in code)

**Token Expiration:**
- Invoice emails: 90 days
- Manual generation: 30 days (configurable via UI)

**Portal URL:**
- Base: `https://trybillable.com` (from `NEXT_PUBLIC_APP_URL`)
- Path: `/client-portal/{TOKEN}`

### Customization Points

**To change token expiration:**

1. **Via UI** (when generating manually):
   - Set "Access Duration (Days)" field
   - Range: 1-365 days

2. **Via API** (programmatic):
   ```typescript
   POST /api/client-portal/generate
   {
     "client_id": "uuid",
     "expires_in_days": 90
   }
   ```

---

## API Reference

### Generate Portal Access

**Endpoint:** `POST /api/client-portal/generate`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "client_id": "uuid",
  "expires_in_days": 30
}
```

**Response:**
```json
{
  "message": "Client portal access created successfully",
  "access_token": "AbCd1234...",
  "portal_url": "/client-portal/AbCd1234...",
  "expires_in_days": 30
}
```

**Error Codes:**
- `401` - Unauthorized (not logged in)
- `404` - Client not found or access denied
- `500` - Server error

### Get Portal Data

**Endpoint:** `GET /api/client-portal/{token}`

**Authentication:** Anonymous (token-based)

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "tenant": {
      "id": "uuid",
      "name": "Your Company",
      "email": "support@yourcompany.com"
    }
  },
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2025-001",
      "status": "sent",
      "total_amount": 1500.00,
      "due_date": "2025-11-15",
      "created_at": "2025-10-17"
    }
  ],
  "portal_info": {
    "token": "AbCd1234...",
    "expires_at": "2025-11-15",
    "last_accessed": "2025-10-17T10:30:00Z"
  }
}
```

---

## Testing the Portal

### Test Checklist

#### ✅ 1. Generate Portal Access
- [ ] Navigate to Dashboard → Clients
- [ ] Click "Portal Access" on any client
- [ ] Set expiration to 7 days
- [ ] Click "Generate Portal Access"
- [ ] Verify token is displayed
- [ ] Copy portal URL

#### ✅ 2. Access Portal (Anonymous)
- [ ] Open portal URL in incognito/private window
- [ ] Verify page loads without login
- [ ] Check client name is displayed correctly
- [ ] Verify statistics cards show correct data
- [ ] Confirm invoices table displays

#### ✅ 3. Test Invoice Actions
- [ ] Click "View" on an invoice
- [ ] Verify PDF opens in new tab
- [ ] Click "Download" on an invoice
- [ ] Verify PDF downloads correctly

#### ✅ 4. Test Expiration
- [ ] In database, set token to expired:
  ```sql
  UPDATE client_portal_access
  SET expires_at = NOW() - INTERVAL '1 day'
  WHERE access_token = 'YOUR_TOKEN';
  ```
- [ ] Try to access portal with expired token
- [ ] Verify "Access Denied" message shows

#### ✅ 5. Test Email Integration
- [ ] Create a new invoice
- [ ] Send invoice via email
- [ ] Check email inbox
- [ ] Click "View Client Portal" link
- [ ] Verify portal loads correctly

---

## Troubleshooting

### Issue: "Access Denied" Error

**Possible Causes:**
1. Token expired
2. Token deactivated (`is_active = false`)
3. RLS policies not applied
4. Client or invoices deleted

**Fix:**
```sql
-- Check token status
SELECT
  access_token,
  is_active,
  expires_at,
  CASE
    WHEN NOT is_active THEN 'Token deactivated'
    WHEN expires_at < NOW() THEN 'Token expired'
    ELSE 'Token valid'
  END as status
FROM client_portal_access
WHERE access_token = 'YOUR_TOKEN';

-- Reactivate token if needed
UPDATE client_portal_access
SET is_active = true,
    expires_at = NOW() + INTERVAL '30 days'
WHERE access_token = 'YOUR_TOKEN';
```

### Issue: Portal Link Not in Email

**Causes:**
1. Token creation failed during email send
2. Email template missing portal link
3. RLS policy blocking token INSERT

**Fix:**
1. Check server logs when sending email
2. Manually generate token from dashboard
3. Run diagnostic script to check RLS policies

### Issue: Can't Generate Portal Access

**Causes:**
1. Not authenticated
2. Client doesn't belong to your tenant
3. RLS policy blocking INSERT

**Fix:**
```sql
-- Verify RLS policy exists
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'client_portal_access'
  AND policyname = 'authenticated_can_manage_portal_access';

-- If missing, run FIX_BOTH_ISSUES_NOW.sql
```

### Issue: Client Sees Other Clients' Data

**This should NEVER happen!** If it does:

1. **IMMEDIATELY** deactivate all tokens:
   ```sql
   UPDATE client_portal_access SET is_active = false;
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename IN ('invoices', 'clients', 'client_portal_access');
   ```

3. Run `CLIENT_PORTAL_DIAGNOSTIC.sql` Part 3

4. Contact support if issue persists

---

## Database Schema

### client_portal_access Table

```sql
CREATE TABLE client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  access_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `client_id` - Which client this token belongs to
- `access_token` - Unique 32-byte random token
- `expires_at` - Optional expiration (NULL = never expires)
- `last_accessed` - Updated each time portal is accessed
- `is_active` - Manual deactivation flag
- `created_at` - When token was created

**Indexes:**
- Unique index on `access_token`
- Index on `client_id` for lookups

---

## Best Practices

### Token Management

**DO:**
- ✅ Set reasonable expiration (30-90 days)
- ✅ Regenerate tokens periodically
- ✅ Deactivate tokens when no longer needed
- ✅ Track last_accessed for audit

**DON'T:**
- ❌ Share tokens publicly
- ❌ Create tokens that never expire (for sensitive data)
- ❌ Reuse tokens across clients
- ❌ Store tokens in cookies/localStorage

### Security

**DO:**
- ✅ Use HTTPS only (trybillable.com is HTTPS)
- ✅ Keep token length at 32+ bytes
- ✅ Use cryptographically secure random generation
- ✅ Log portal access for audit trails

**DON'T:**
- ❌ Send tokens in URL query parameters (use path instead)
- ❌ Log tokens in plain text
- ❌ Allow token prediction
- ❌ Disable RLS policies

### Client Communication

**DO:**
- ✅ Explain what portal access is
- ✅ Mention expiration date in email
- ✅ Provide support contact
- ✅ Send portal link via secure channel

**DON'T:**
- ❌ Send portal link via unsecured channels
- ❌ Share same link with multiple people
- ❌ Assume clients know how to use it

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check for expired tokens
- Review portal access logs
- Monitor for suspicious access patterns

**Monthly:**
- Clean up inactive tokens:
  ```sql
  DELETE FROM client_portal_access
  WHERE is_active = false
    AND created_at < NOW() - INTERVAL '90 days';
  ```

**Quarterly:**
- Review RLS policies
- Update token expiration policies
- Audit client access patterns

---

## Future Enhancements

Potential features to add:

- [ ] **Payment integration** - Allow clients to pay directly from portal
- [ ] **Ticket viewing** - Show client's support tickets
- [ ] **Document uploads** - Clients upload documents
- [ ] **2FA option** - Optional email verification
- [ ] **Activity log** - Show portal access history
- [ ] **Custom branding** - Per-tenant portal styling
- [ ] **Mobile app** - Native iOS/Android portal access

---

## Support & Resources

**Documentation:**
- This guide: `CLIENT_PORTAL_GUIDE.md`
- Diagnostic script: `CLIENT_PORTAL_DIAGNOSTIC.sql`
- Testing checklist: `TESTING_CHECKLIST.md`

**Database Access:**
- Supabase Dashboard: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz
- SQL Editor: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql

**Code References:**
- Portal page: [src/app/client-portal/[token]/page.tsx](src/app/client-portal/[token]/page.tsx)
- API route: [src/app/api/client-portal/[token]/route.ts](src/app/api/client-portal/[token]/route.ts)
- Manager component: [src/components/client-portal-manager.tsx](src/components/client-portal-manager.tsx)
- Layout component: [src/components/client-portal-layout.tsx](src/components/client-portal-layout.tsx)

**Environment:**
- App URL: https://trybillable.com
- Supabase URL: https://zpplkvwykqvwdzuvjdwz.supabase.co
- Node Environment: Check `.env.local`

---

## Quick Reference

### Generate Portal Link (UI)
1. Dashboard → Clients
2. Click "Portal Access" button
3. Set expiration → Generate
4. Copy link or email to client

### Generate Portal Link (API)
```bash
curl -X POST https://trybillable.com/api/client-portal/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"client_id":"UUID","expires_in_days":30}'
```

### Check Portal Status (SQL)
```sql
SELECT * FROM client_portal_access WHERE client_id = 'UUID';
```

### Deactivate Token (SQL)
```sql
UPDATE client_portal_access SET is_active = false WHERE access_token = 'TOKEN';
```

### Test Portal Access
```
https://trybillable.com/client-portal/YOUR_TOKEN
```

---

**Built with ❤️ for Billable SaaS**
**Last Updated:** October 17, 2025
