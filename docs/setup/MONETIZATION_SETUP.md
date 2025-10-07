# SaaS Monetization Setup Guide

Complete guide to monetize TryBillable with user subscriptions and Stripe Connect for user payments.

---

## 🎯 Two-Part Strategy

### Part 1: **You Get Paid** (App Revenue)
Users pay YOU to use the app via monthly/annual subscriptions

### Part 2: **Users Get Paid** (User Revenue)
Your users connect their Stripe accounts to receive payments from THEIR clients

---

## Part 1: App Monetization (Subscription Billing)

### Overview
Charge users to access your app with free trials and tiered pricing.

### Architecture Options

#### Option A: Stripe Billing (Recommended for SaaS)
**Best for:** Recurring subscriptions, automatic billing, usage-based pricing

**Pricing:** 0.5% + Stripe fees (2.9% + $0.30) = ~3.4% total

**Features:**
- ✅ Automatic recurring billing
- ✅ Free trial management
- ✅ Proration and upgrades
- ✅ Usage-based billing (if needed)
- ✅ Customer portal for users
- ✅ Dunning (failed payment retry)
- ✅ Invoice generation
- ✅ Tax calculation (Stripe Tax)

**Implementation Steps:**

1. **Create Products in Stripe**
   ```bash
   # In Stripe Dashboard → Products

   Product 1: Starter Plan
   - Price: $29/month or $290/year (save 17%)
   - Features: 5 clients, 50 tickets/month, 1 user

   Product 2: Professional Plan
   - Price: $79/month or $790/year (save 17%)
   - Features: 25 clients, 250 tickets/month, 3 users

   Product 3: Business Plan
   - Price: $149/month or $1490/year (save 17%)
   - Features: Unlimited clients, unlimited tickets, 10 users

   All plans include:
   - 14-day free trial
   - Invoice generation
   - Time tracking
   - Client portal
   - Email notifications
   ```

2. **Database Schema Updates**
   ```sql
   -- Add subscription tracking to tenants table
   ALTER TABLE tenants ADD COLUMN subscription_id TEXT;
   ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'trialing';
   ALTER TABLE tenants ADD COLUMN subscription_plan TEXT DEFAULT 'starter';
   ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP;
   ALTER TABLE tenants ADD COLUMN subscription_current_period_end TIMESTAMP;
   ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;

   -- Create subscription limits table
   CREATE TABLE subscription_limits (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     plan_name TEXT NOT NULL UNIQUE,
     max_clients INTEGER,
     max_tickets_per_month INTEGER,
     max_users INTEGER,
     price_monthly INTEGER, -- in cents
     price_yearly INTEGER, -- in cents
     features JSONB,
     created_at TIMESTAMP DEFAULT now()
   );

   -- Insert plan limits
   INSERT INTO subscription_limits (plan_name, max_clients, max_tickets_per_month, max_users, price_monthly, price_yearly, features) VALUES
   ('starter', 5, 50, 1, 2900, 29000, '{"invoice_pdf": true, "email_notifications": true}'),
   ('professional', 25, 250, 3, 7900, 79000, '{"invoice_pdf": true, "email_notifications": true, "sla_monitoring": true}'),
   ('business', NULL, NULL, 10, 14900, 149000, '{"invoice_pdf": true, "email_notifications": true, "sla_monitoring": true, "priority_support": true}');
   ```

3. **API Routes to Create**

   **`/api/billing/create-checkout-session` - Start subscription**
   ```typescript
   // User selects plan → redirect to Stripe Checkout
   POST /api/billing/create-checkout-session
   Body: { plan: 'professional', billing_period: 'monthly' }
   Response: { checkout_url: 'https://checkout.stripe.com/...' }
   ```

   **`/api/billing/webhook` - Handle subscription events**
   ```typescript
   // Stripe webhooks for subscription lifecycle
   POST /api/billing/webhook
   Events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
   ```

   **`/api/billing/portal` - Customer portal**
   ```typescript
   // User manages subscription, payment methods, invoices
   POST /api/billing/portal
   Response: { portal_url: 'https://billing.stripe.com/...' }
   ```

4. **Middleware for Usage Limits**
   ```typescript
   // src/middleware/subscription.ts

   export async function checkSubscriptionLimits(
     tenantId: string,
     resource: 'clients' | 'tickets' | 'users'
   ) {
     const tenant = await getTenant(tenantId);
     const limits = await getSubscriptionLimits(tenant.subscription_plan);

     if (tenant.subscription_status !== 'active' && !isInTrial(tenant)) {
       throw new Error('Subscription expired. Please update billing.');
     }

     const currentUsage = await getResourceCount(tenantId, resource);

     if (limits[`max_${resource}`] && currentUsage >= limits[`max_${resource}`]) {
       throw new Error(`Upgrade your plan to add more ${resource}`);
     }
   }
   ```

5. **UI Components to Add**
   - Pricing page (`/pricing`)
   - Billing settings (`/dashboard/settings/billing`)
   - Subscription status banner (trial ending, payment failed)
   - Upgrade prompts when hitting limits

---

#### Option B: Manual Payment Links (Simple Start)
**Best for:** MVP, simple pricing, manual management

**Implementation:**
1. Create payment links in Stripe Dashboard for each plan
2. Send links to users via email
3. Manually activate subscriptions in database
4. Use webhooks to automate status updates

**Pros:** Quick to set up, no code needed initially
**Cons:** No automatic trial management, more manual work

---

### Free Trial Implementation

**Recommended Flow:**
1. User signs up → Automatically starts 14-day free trial
2. Prompt for payment method at end of trial
3. Auto-charge when trial ends (if payment method added)
4. Lock account if no payment after trial

**Database Logic:**
```sql
-- On signup
UPDATE tenants SET
  subscription_status = 'trialing',
  trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = :tenant_id;

-- Check trial status (run daily via cron)
SELECT id, email FROM tenants
WHERE subscription_status = 'trialing'
  AND trial_ends_at < NOW();
-- Send email: "Trial ending soon, add payment method"
```

---

## Part 2: Stripe Connect (Users Get Paid)

### Overview
Allow your users to connect their Stripe accounts so THEIR clients can pay THEM directly.

### Implementation Status
✅ Already implemented! See [STRIPE_CONNECT_SETUP.md](STRIPE_CONNECT_SETUP.md)

### Quick Summary

**What's Working:**
- OAuth-style Stripe Connect onboarding
- Settings page for connection management
- Payment button on invoices
- Automatic invoice status updates via webhooks

**How It Works:**
1. User clicks "Connect Stripe Account" in Settings → Payments
2. Redirected to Stripe onboarding
3. User enters business details, bank account
4. Once approved, "Pay with Card" button appears on sent invoices
5. Client pays → money goes to YOUR USER's Stripe account
6. Invoice auto-marked as paid

**Testing:**
1. Go to Settings → Payments
2. Click "Connect Stripe Account"
3. Complete test mode onboarding (use test bank account)
4. Create & send invoice
5. Click "Pay with Card"
6. Use test card: `4242 4242 4242 4242`
7. Verify payment in user's Stripe Dashboard

**See [STRIPE_CONNECT_SETUP.md](STRIPE_CONNECT_SETUP.md) for full details.**

---

## Recommended Implementation Order

### Week 1: Basic Subscription Setup
1. ✅ Create products in Stripe Dashboard
2. ✅ Add database columns for subscriptions
3. ✅ Create checkout session API route
4. ✅ Build pricing page
5. ✅ Test checkout flow

### Week 2: Subscription Management
1. ✅ Implement webhook handlers
2. ✅ Build billing settings page
3. ✅ Add customer portal link
4. ✅ Create subscription status banners
5. ✅ Test subscription lifecycle (create, update, cancel)

### Week 3: Usage Limits & Trials
1. ✅ Implement middleware for usage checks
2. ✅ Add upgrade prompts
3. ✅ Setup trial email notifications
4. ✅ Test limit enforcement
5. ✅ Add analytics for conversions

### Week 4: Polish & Launch
1. ✅ Test payment failures
2. ✅ Setup dunning emails
3. ✅ Add revenue dashboard
4. ✅ Create help docs
5. ✅ Launch! 🚀

---

## Complete Tech Stack

### Backend (API Routes)
- `/api/billing/create-checkout-session` - Start subscription
- `/api/billing/webhook` - Stripe subscription webhooks
- `/api/billing/portal` - Customer portal access
- `/api/payments/webhook` - Stripe Connect payments (already exists)
- `/api/admin/subscriptions` - Admin subscription management

### Database
- `tenants.subscription_*` columns
- `subscription_limits` table
- `subscription_usage` table (optional, for analytics)

### Frontend Pages
- `/pricing` - Public pricing page
- `/dashboard/settings/billing` - Subscription management
- `/dashboard/settings/payments` - Stripe Connect (already exists)
- `/admin/revenue` - Revenue dashboard (optional)

### Middleware
- Subscription status check on protected routes
- Usage limit enforcement on resource creation
- Trial expiration warnings

---

## Pricing Examples

### Recommended Pricing Tiers

**Starter - $29/month**
- Perfect for freelancers
- 5 clients
- 50 tickets/month
- 1 user seat
- All core features

**Professional - $79/month** ⭐ Most Popular
- For growing agencies
- 25 clients
- 250 tickets/month
- 3 user seats
- SLA monitoring
- Priority support

**Business - $149/month**
- For established businesses
- Unlimited clients
- Unlimited tickets
- 10 user seats
- White-label option
- Dedicated support

**Annual Discount: 17% off** (e.g., $29/mo → $290/year = save $58)

---

## Revenue Projections

### Conservative Estimates (Year 1)

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Free trials | 50 | 150 | 400 |
| Trial → Paid | 20% | 25% | 30% |
| Paid users | 10 | 45 | 145 |
| Avg plan | $50 | $60 | $65 |
| MRR | $500 | $2,700 | $9,425 |
| ARR | - | - | $113,100 |

### Aggressive Estimates (Year 1)

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Free trials | 100 | 400 | 1000 |
| Trial → Paid | 25% | 30% | 35% |
| Paid users | 25 | 145 | 425 |
| Avg plan | $60 | $70 | $75 |
| MRR | $1,500 | $10,150 | $31,875 |
| ARR | - | - | $382,500 |

**Assumptions:**
- 10-15% monthly churn
- 30% annual plans (higher LTV)
- 2-3% Stripe fees
- 5% payment failures

---

## Critical Implementation Files

### 1. Checkout Session API
**File:** `src/app/api/billing/create-checkout-session/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { plan, billing_period } = await req.json();
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenant:tenants(stripe_customer_id)')
    .eq('id', user.id)
    .single();

  const tenant = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;

  // Get or create Stripe customer
  let customerId = tenant?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { tenant_id: profile.tenant_id }
    });
    customerId = customer.id;

    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.tenant_id);
  }

  // Get price ID from environment or database
  const priceId = getPriceId(plan, billing_period);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=cancelled`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { tenant_id: profile.tenant_id }
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ checkout_url: session.url });
}

function getPriceId(plan: string, period: string): string {
  const prices = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    professional_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    professional_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  };

  return prices[`${plan}_${period}`] || prices.starter_monthly;
}
```

### 2. Subscription Webhook Handler
**File:** `src/app/api/billing/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_BILLING_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await supabaseAdmin
        .from('tenants')
        .update({
          subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_plan: subscription.metadata.plan || 'starter',
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', subscription.metadata.tenant_id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await supabaseAdmin
        .from('tenants')
        .update({
          subscription_status: 'cancelled',
        })
        .eq('subscription_id', subscription.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      // Send email notification to user
      // Lock account after 3 failed attempts
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### 3. Pricing Page
**File:** `src/app/pricing/page.tsx`

Create a beautiful pricing page with:
- 3 pricing tiers with feature comparison
- Toggle for monthly/yearly
- "Start Free Trial" buttons
- Social proof (testimonials, logos)
- FAQ section

---

## Environment Variables Needed

Add to `.env.local` and Vercel:

```bash
# Stripe Billing (for subscriptions - SEPARATE from Stripe Connect)
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxxxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxxxx
STRIPE_BILLING_WEBHOOK_SECRET=whsec_xxxxx

# Existing Stripe Connect (for user payments)
STRIPE_SECRET_KEY=sk_test_xxxxx (already configured)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (already configured)
```

---

## Testing Checklist

### Subscription Flow
- [ ] User can start free trial without payment method
- [ ] User can add payment method during trial
- [ ] Subscription activates after trial ends
- [ ] User can upgrade/downgrade plans
- [ ] User can cancel subscription
- [ ] Failed payments show banner and retry
- [ ] Usage limits are enforced
- [ ] Customer portal works

### Stripe Connect (User Payments)
- [ ] User can connect Stripe account
- [ ] Invoices show "Pay with Card" button
- [ ] Payments go to user's Stripe account
- [ ] Invoice status updates automatically
- [ ] Webhook events are received
- [ ] User can disconnect account

---

## Next Steps

1. **Choose subscription approach** (Stripe Billing vs Manual)
2. **Create products in Stripe** (3 plans with monthly/yearly pricing)
3. **Implement checkout flow** (API route + pricing page)
4. **Setup webhook** (handle subscription events)
5. **Build billing settings** (customer portal + status)
6. **Test with Stripe test mode** (full subscription lifecycle)
7. **Add usage limits** (enforce plan restrictions)
8. **Go live!** 🚀

---

## Resources

- **Stripe Billing Docs:** https://stripe.com/docs/billing
- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Subscription Best Practices:** https://stripe.com/guides/subscriptions

---

## Need Help?

Follow these guides in order:
1. **[STRIPE_SETUP.md](STRIPE_SETUP.md)** - Basic Stripe payment setup ✅ DONE
2. **[STRIPE_CONNECT_SETUP.md](STRIPE_CONNECT_SETUP.MD)** - User payment setup ✅ DONE
3. **[STRIPE_PAYMENT_TESTING.md](STRIPE_PAYMENT_TESTING.md)** - Testing guide ✅ DONE
4. **THIS FILE** - App monetization setup 📍 YOU ARE HERE

Start with creating products in Stripe Dashboard, then build the checkout flow!
