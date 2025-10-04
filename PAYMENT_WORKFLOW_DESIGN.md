# Payment Workflow Design

**Last Updated:** 2025-10-03
**Status:** Planning Phase

---

## Executive Summary

**Goal:** Enable users to get paid by their clients through the platform

**Recommended Approach:** Hybrid model with Stripe Connect (primary) + Manual payment instructions (fallback)

---

## Payment Architecture

### Current State ❌
- Existing Stripe code goes to ONE central account (YOUR account)
- Users can't receive payments
- Only generates invoices (no payment flow)

### Proposed State ✅
- Each user connects THEIR OWN Stripe account
- Clients pay directly to user's Stripe
- Platform can take optional fee (e.g., 2% of transaction)
- Fallback to manual payment instructions

---

## Invoice Status Workflow

### Current Status States
From `schema.sql`:
```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
```

### Proposed Status Flow

```
┌─────────┐
│  DRAFT  │ ← User is editing, not visible to client
└────┬────┘
     │ User clicks "Send Invoice"
     ↓
┌─────────┐
│  SENT   │ ← Email sent to client, visible in client portal
└────┬────┘
     │ (Multiple paths from here)
     ├─→ Client pays → PAID ✅
     ├─→ Client pays partial → PARTIAL 💰
     ├─→ Due date passes → OVERDUE ⚠️
     └─→ User cancels → CANCELLED ❌
```

**New Status to Add:**
- `partial` - Client paid some but not full amount

### Status Transition Rules

| From | To | Trigger | Who Can Do It |
|------|----|---------
|--------------|
| draft | sent | User clicks "Send" | User only |
| sent | paid | Payment received OR manual mark | User or System |
| sent | partial | Partial payment received | User or System |
| sent | overdue | Due date passes, not paid | System (cron job) |
| sent | cancelled | User cancels invoice | User only |
| overdue | paid | Payment received | User or System |
| partial | paid | Remaining payment received | User or System |
| any | draft | User resets (delete & recreate) | User only |

---

## Payment Methods

### Method 1: Stripe Connect (Primary) ⭐

**What is Stripe Connect?**
- Allows your users to connect their own Stripe accounts
- Payments go directly to their account
- You can take a platform fee (optional)
- Stripe handles all compliance, taxes, payouts

**User Experience:**

1. **User Setup (One-time):**
   ```
   Settings → Payments → "Connect Stripe Account"
   ↓
   Redirected to Stripe OAuth
   ↓
   Authorizes your app to create payments
   ↓
   Redirected back to your app
   ↓
   ✅ Stripe Connected! Can now accept online payments
   ```

2. **Creating Invoice:**
   ```
   User creates invoice
   ↓
   System checks: Does user have Stripe connected?
   ↓
   YES → Include "Pay with Stripe" button in invoice
   NO  → Show only manual payment instructions
   ```

3. **Client Paying:**
   ```
   Client receives invoice email
   ↓
   Clicks "Pay Invoice" button
   ↓
   Redirected to Stripe Checkout
   ↓
   Enters card info (or uses Apple Pay, Google Pay, etc.)
   ↓
   Pays → Money goes to user's Stripe account
   ↓
   System receives webhook → Marks invoice as PAID
   ↓
   User gets notification: "You've been paid!"
   ```

**Database Schema Addition:**

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN stripe_account_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN stripe_account_status VARCHAR(50);
  -- Possible values: 'none', 'pending', 'active', 'restricted'

-- Track Stripe Connect setup progress
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_account_id VARCHAR(255) NOT NULL,
  account_status VARCHAR(50) DEFAULT 'pending',
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add payment method to invoices
ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50) DEFAULT 'manual';
  -- Possible values: 'stripe', 'manual', 'wire', 'check', 'crypto'
ALTER TABLE invoices ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN stripe_checkout_session_id VARCHAR(255);
```

**Implementation Steps:**

1. **Register for Stripe Connect** (https://dashboard.stripe.com/connect/accounts/overview)
   - Get `STRIPE_CONNECT_CLIENT_ID`

2. **Add OAuth Flow:**
   - User clicks "Connect Stripe"
   - Redirect to: `https://connect.stripe.com/oauth/authorize?client_id=XXX&scope=read_write`
   - Stripe redirects back to: `https://yourapp.com/api/stripe/callback?code=XXX`
   - Exchange code for `stripe_account_id`
   - Save to database

3. **Create Payment Intent API:**
   - When client clicks "Pay", create payment intent on user's connected account
   - Redirect to Stripe Checkout
   - Use `stripe_account` parameter to route money to user

4. **Handle Webhooks:**
   - Listen for `checkout.session.completed`
   - Mark invoice as paid
   - Send notification to user

**Code Example:**

```typescript
// src/app/api/stripe/connect/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  // Exchange code for account ID
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  });

  // Save to database
  await supabase
    .from('profiles')
    .update({
      stripe_account_id: response.stripe_user_id,
      stripe_account_status: 'active'
    })
    .eq('id', userId);

  return redirect('/settings/payments?success=true');
}

// When creating invoice payment
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [...],
  mode: 'payment',
  success_url: 'https://yourapp.com/invoice/success',
  cancel_url: 'https://yourapp.com/invoice/cancel',
}, {
  stripeAccount: user.stripe_account_id, // ← Money goes to user!
});
```

**Platform Fee (Optional):**
```typescript
// Take 2% platform fee
const session = await stripe.checkout.sessions.create({
  // ... other params
  payment_intent_data: {
    application_fee_amount: Math.round(total * 0.02 * 100), // 2% fee in cents
  },
}, {
  stripeAccount: user.stripe_account_id,
});
```

---

### Method 2: Manual Payment Instructions (Fallback)

**When to use:**
- User hasn't connected Stripe
- Client prefers bank transfer, check, crypto, etc.
- International payments where Stripe isn't available

**User Experience:**

1. **User Setup:**
   ```
   Settings → Payment Methods
   ↓
   Add default payment instructions:
   "Bank: Chase | Account: 123456789 | Routing: 987654321"
   "Venmo: @myusername"
   "Crypto: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
   ```

2. **Creating Invoice:**
   ```
   User creates invoice
   ↓
   Payment instructions auto-filled from settings
   ↓
   User can customize per invoice
   ↓
   Invoice sent to client with instructions
   ```

3. **Client Paying:**
   ```
   Client receives invoice
   ↓
   Sees payment instructions
   ↓
   Pays via bank transfer/Venmo/etc (outside system)
   ↓
   User manually marks invoice as PAID in dashboard
   ```

**Database Schema:**
```sql
-- Add to tenants or profiles table
ALTER TABLE profiles ADD COLUMN default_payment_instructions TEXT;

-- Or create separate table for multiple methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  method_type VARCHAR(50) NOT NULL, -- 'bank', 'venmo', 'paypal', 'crypto'
  method_name VARCHAR(100),
  instructions TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Invoice Actions & UI

### Current UI (Needs Improvement)
- Only has "..." menu with status change
- No clear "Send Invoice" flow
- No payment tracking

### Proposed UI

**Invoice List Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Invoice: INV-2025-0001          Status: [DRAFT ▼]       │
│ Client: Acme Corp               Amount: $1,250.00        │
│                                                          │
│ [✉️ Send Invoice] [👁️ Preview] [...More]                │
└─────────────────────────────────────────────────────────┘

More menu:
• Download PDF
• Copy Link
• Mark as Paid
• Cancel Invoice
• Delete Draft
```

**Invoice Detail Page:**
```
┌─────────────────────────────────────────────────────────┐
│                     INVOICE #INV-2025-0001              │
│                                                          │
│  Status: SENT                      Due: Dec 31, 2025    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  FROM: Your Company                                      │
│  TO: Acme Corp (john@acme.com)                          │
│                                                          │
│  LINE ITEMS:                                             │
│  • Web Development    10.0 hrs × $125    = $1,250.00    │
│                                                          │
│  TOTAL: $1,250.00                                        │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ PAYMENT OPTIONS                              │       │
│  │                                               │       │
│  │ [💳 Pay with Stripe - $1,250.00]             │       │
│  │                                               │       │
│  │ Or pay manually:                             │       │
│  │ Bank Transfer: Chase 123456789               │       │
│  │ Venmo: @username                             │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
│  [✉️ Send to Client] [📥 Download PDF] [✏️ Edit]        │
└─────────────────────────────────────────────────────────┘
```

**Status Badge Colors:**
- DRAFT: Gray
- SENT: Blue
- PAID: Green
- PARTIAL: Yellow
- OVERDUE: Red
- CANCELLED: Dark Gray

---

## Email Notifications

### Invoice Sent Email (to Client)
```
Subject: Invoice #INV-2025-0001 from Your Company

Hi John,

You have a new invoice from Your Company for $1,250.00

Due Date: December 31, 2025

[View Invoice & Pay] (Button)

Or view it here: https://app.trybillable.com/invoice/abc123token

Questions? Reply to this email.

Thanks,
Your Company
```

### Payment Received Email (to User)
```
Subject: 🎉 Payment Received - $1,250.00

Great news! Acme Corp just paid invoice #INV-2025-0001

Amount: $1,250.00
Paid via: Stripe
Date: Oct 3, 2025

The money has been deposited to your Stripe account.

[View Invoice]
```

---

## Implementation Checklist

### Phase 1: Invoice Status Workflow (2-3 hours)
- [ ] Add `partial` status to database enum
- [ ] Update invoice detail page UI
- [ ] Add "Send Invoice" button
- [ ] Add status change dropdown
- [ ] Add "Mark as Paid" action
- [ ] Add email notification when status changes to "sent"

### Phase 2: Manual Payment Instructions (1 hour)
- [ ] Add payment instructions field to invoice
- [ ] Create settings page for default payment instructions
- [ ] Display payment instructions in invoice view
- [ ] Include instructions in email notifications

### Phase 3: Stripe Connect (3-4 hours)
- [ ] Register for Stripe Connect
- [ ] Add database fields for stripe_account_id
- [ ] Create OAuth connection flow
- [ ] Build settings page "Connect Stripe"
- [ ] Create payment intent API for connected accounts
- [ ] Add "Pay with Stripe" button to invoices
- [ ] Implement webhook handler for payments
- [ ] Test with Stripe test mode

### Phase 4: Client Portal Enhancement (2 hours)
- [ ] Add payment button to client portal
- [ ] Show payment status/history
- [ ] Handle successful/failed payment states

---

## Testing Plan

1. **Test without Stripe Connected:**
   - Create invoice
   - Send to client
   - Verify only manual payment shows
   - Mark as paid manually

2. **Test with Stripe Connected:**
   - Connect test Stripe account
   - Create invoice
   - Client clicks "Pay with Stripe"
   - Use test card: 4242 4242 4242 4242
   - Verify invoice marked as paid
   - Verify money in connected account

3. **Test Status Transitions:**
   - Draft → Sent
   - Sent → Paid
   - Sent → Overdue (manually change due date to past)
   - Sent → Cancelled

---

## Competitive Research

**How others do it:**

| Platform | Payment Method | Notes |
|----------|----------------|-------|
| FreshBooks | Stripe Connect + Manual | Can accept CC, ACH, checks |
| Harvest | Stripe Connect + PayPal | $10-20/mo plans |
| Invoicely | Stripe Connect | Free tier available |
| Wave | Stripe Direct (Wave takes cut) | Free, makes money on fees |
| Bonsai | Stripe Connect | $24/mo |

**Your Differentiator:**
- Stripe Connect for flexibility
- Manual payment as fallback (many freelancers use Venmo/Zelle)
- SLA monitoring (unique!)
- Client portal included (others charge extra)

---

## Revenue Model

**Option 1: Flat Monthly Fee (Recommended)**
- Free: 5 invoices/month, no Stripe
- Pro ($19/mo): Unlimited invoices, Stripe Connect, client portal
- No transaction fees

**Option 2: Transaction Fee**
- Free to use
- 2% fee on Stripe payments
- (Like Wave Accounting)

**Option 3: Hybrid**
- Free: Manual payments only
- Pro ($19/mo): Stripe Connect, no transaction fees

**My Recommendation:** Option 1 - Flat fee, no transaction percentage. Simpler, predictable for users.

---

## Next Steps

**Today:**
1. Fix PDF generation (DONE ✅)
2. Review this design doc
3. Decide on payment approach

**Tomorrow:**
1. Implement invoice status workflow
2. Add "Send Invoice" feature
3. Add manual payment instructions

**This Week:**
1. Register for Stripe Connect
2. Implement OAuth flow
3. Test end-to-end payment

**Beta Launch:**
- Start with manual payments only
- Add Stripe Connect in v1.1 (1-2 weeks post-launch)
- Gives you time to test with real users first

---

## Questions to Answer

1. **Do you want to take platform fees on Stripe payments?**
   - Yes → 2-3% of each transaction
   - No → Keep it simple, just charge monthly fee

2. **Should invoice status be changeable by user or automatic?**
   - Current: User can manually change via dropdown
   - Recommended: Automatic (paid via webhook), but allow manual override

3. **What's your beta launch priority?**
   - A) Ship fast with manual payments only
   - B) Wait 2-3 days, include Stripe Connect

4. **Do you want Stripe to be YOUR revenue source or just facilitate user payments?**
   - Facilitate only → Stripe Connect (recommended)
   - Revenue source → Stripe Direct + platform fees

---

**My Recommendation:**
- Launch with **manual payments** first (2 hours of work)
- Add **Stripe Connect** in week 2 (3 hours of work)
- This gets you to market faster
- Less risk of payment bugs delaying launch
- You can validate the SaaS concept before spending time on payment integrations

What do you think?
