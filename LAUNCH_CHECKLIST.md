# TryBillable.com - Launch Checklist

**Target Beta Launch Date:** Week of October 7-14, 2025

This checklist will guide you from current state (95% complete) to beta launch with 50+ users.

---

## 🚦 Current Status

### ✅ Completed (You're Here!)
- [x] Database schema finalized
- [x] All core features implemented
- [x] Stripe payment integration code complete
- [x] Client portal ready
- [x] SLA monitoring working
- [x] Email notification infrastructure built
- [x] Mobile-responsive UI
- [x] Keyboard shortcuts
- [x] CSV exports
- [x] Analytics dashboard
- [x] Old SQL files archived
- [x] VISION.md documented
- [x] STRIPE_SETUP.md created

---

## 📋 Week 1: Stripe Setup & Testing (3-4 hours)

### Day 1: Stripe Account Setup (1 hour)
- [ ] Log into [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Complete business profile
- [ ] Add business bank account
- [ ] Copy test API keys from Developers > API keys
- [ ] Update `.env.local` with:
  ```bash
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_SECRET_KEY=sk_test_...
  ```

### Day 2: Supabase Service Key (30 mins)
- [ ] Go to Supabase Dashboard > Settings > API
- [ ] Copy `service_role` key
- [ ] Update `.env.local`:
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
  ```

### Day 3: Run Database Migration (30 mins)
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Run migration: `supabase/migrations/20251002000001_add_payments_table.sql`
- [ ] Verify `payments` table exists
- [ ] Check RLS policies are active

### Day 4: Webhook Setup (1 hour)
- [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] Start webhook listener:
  ```bash
  stripe listen --forward-to localhost:3000/api/payments/webhook
  ```
- [ ] Copy webhook secret (starts with `whsec_`)
- [ ] Add to `.env.local`:
  ```bash
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

### Day 5: Test Payment Flow (1 hour)
- [ ] Start dev server: `npm run dev`
- [ ] In another terminal: `stripe listen --forward-to localhost:3000/api/payments/webhook`
- [ ] Create test invoice in app
- [ ] Access client portal
- [ ] Click "Pay Now" button
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Verify:
  - [ ] Redirected to Stripe Checkout
  - [ ] Payment completes successfully
  - [ ] Webhook events received in terminal
  - [ ] Invoice status updates to "paid"
  - [ ] Payment record created in database

**If test passes:** ✅ Stripe is ready!

---

## 📋 Week 2: Email & Onboarding (4-5 hours)

### Email Service Setup (1 hour)

**Option A: Resend (Recommended)**
- [ ] Sign up: [resend.com](https://resend.com)
- [ ] Get API key (free tier: 3000 emails/month)
- [ ] Install: `npm install resend`
- [ ] Add to `.env.local`:
  ```bash
  RESEND_API_KEY=re_...
  ```
- [ ] Verify domain (trybillable.com)
- [ ] Send test email

**Option B: Use existing Supabase notifications**
- [ ] Skip for beta (Supabase has basic email)
- [ ] Queue this for post-beta

### Onboarding Flow (3-4 hours)

Create: `src/app/dashboard/onboarding/page.tsx`

**Steps:**
1. Welcome screen
   - "Welcome to TryBillable! Let's get you set up."
2. Create first client (optional skip)
   - Pre-fill example: "Acme Corp"
3. Create first ticket (optional skip)
   - Pre-fill example: "Website redesign consultation"
4. Start timer demo
   - Show timer widget in action
5. Complete!
   - Redirect to dashboard

**Use existing components:**
- Client modal: `src/components/modals/client-modal.tsx`
- Ticket modal: `src/components/modals/ticket-modal.tsx`
- Timer: `src/components/timer-widget.tsx`

---

## 📋 Week 3: Polish & Legal (3-4 hours)

### Landing Page Updates (2 hours)

Update: `src/components/home/hero.tsx`
- [ ] Replace "My Ticketing SaaS" with "TryBillable"
- [ ] Update headline: "Time tracking that actually gets you paid"
- [ ] Add screenshot or demo GIF
- [ ] Update CTA: "Start Your Free Trial"

Update: `src/components/home/pricing.tsx`
- [ ] Verify pricing matches VISION.md ($19/$49/$99)
- [ ] Add "Most Popular" badge to Professional tier
- [ ] Link to signup page

### Legal Pages (1 hour)

**Quick Solution:**
- [ ] Use [Terms Feed](https://app.termsfeed.com/wizard/terms-conditions)
- [ ] Generate Privacy Policy
- [ ] Generate Terms of Service
- [ ] Create `src/app/legal/privacy/page.tsx`
- [ ] Create `src/app/legal/terms/page.tsx`
- [ ] Add links to footer

### Final Testing (1 hour)
- [ ] Full user flow walkthrough:
  - [ ] Sign up new account
  - [ ] Complete onboarding
  - [ ] Create client
  - [ ] Create ticket
  - [ ] Track time
  - [ ] Generate invoice
  - [ ] Send to client portal
  - [ ] Pay invoice (Stripe test card)
  - [ ] Verify payment received
- [ ] Mobile testing (iPhone/Android)
- [ ] Cross-browser (Chrome, Firefox, Safari)

---

## 📋 Week 4: Beta Launch (6-8 hours)

### Pre-Launch Setup (2 hours)

**Domain & Hosting:**
- [ ] Point trybillable.com to Vercel/hosting
- [ ] Set up SSL certificate
- [ ] Update `.env` production variables
- [ ] Test production deployment
- [ ] Set up production webhook: `https://trybillable.com/api/payments/webhook`

**Analytics:**
- [ ] Add Google Analytics
- [ ] Set up PostHog (optional, for product analytics)
- [ ] Configure conversion tracking

**Support:**
- [ ] Set up support@trybillable.com email
- [ ] Add Intercom chat widget (optional)
- [ ] Create help docs (basic FAQ)

### Launch Day Preparation (2 hours)

**Product Hunt:**
- [ ] Create product listing
- [ ] Write compelling description
- [ ] Upload screenshots (5-6 images)
- [ ] Record demo video (2 min)
- [ ] Set hunter/maker profiles
- [ ] Schedule launch (Tuesday-Thursday optimal)

**Beta Launch List:**
- [ ] Draft personal outreach emails (template below)
- [ ] Create LinkedIn post
- [ ] Write Reddit posts (r/freelance, r/SideProject)
- [ ] Indie Hackers post

### Launch Week (2-4 hours)

**Day 1 - Soft Launch (Monday):**
- [ ] Send to 10 close friends/colleagues
- [ ] Monitor for critical bugs
- [ ] Collect initial feedback

**Day 2 - Personal Network (Tuesday):**
- [ ] Email all contacts (50-100 people)
- [ ] Post on LinkedIn
- [ ] Share in relevant Slack communities

**Day 3 - Product Hunt (Wednesday):**
- [ ] Submit to Product Hunt at 12:01 AM PST
- [ ] Reply to all comments throughout day
- [ ] Share on Twitter every 2 hours
- [ ] Post updates in PH discussion

**Day 4-5 - Reddit & Communities:**
- [ ] Post on r/freelance
- [ ] Post on r/SideProject
- [ ] Post on Indie Hackers
- [ ] Share in HN "Show HN"

### Post-Launch (Ongoing)

**Week 1:**
- [ ] Send personalized onboarding emails to all signups
- [ ] Schedule 15-min Zoom calls with first 10 users
- [ ] Fix critical bugs within 24 hours
- [ ] Send daily recap to yourself (signups, MRR, feedback)

**Week 2:**
- [ ] Send first newsletter to users
- [ ] Post case study (if 1-2 success stories)
- [ ] Publish 2 blog posts
- [ ] Start SEO content calendar

**Week 3-4:**
- [ ] Implement most-requested features
- [ ] Collect 3+ testimonials
- [ ] Calculate actual churn rate
- [ ] Plan next sprint based on feedback

---

## 📧 Email Templates

### Beta Outreach Email

**Subject:** I built a tool to solve [pain point] - would love your feedback

**Body:**
```
Hi [Name],

I know you [freelance/consult/run an agency], so I thought you might find this useful.

I just launched TryBillable (trybillable.com) - it's time tracking + invoicing + payment collection all in one place.

No more juggling Toggl, QuickBooks, and chasing late payments over email.

I'm looking for 50 beta users to test it out. Would you be up for trying it and giving me honest feedback?

It's free during beta, and I'll throw in 3 months free when we go live.

Let me know!

[Your Name]

P.S. You can sign up here: https://trybillable.com/signup
```

### Day 7 Follow-Up Email (Automated)

**Subject:** How's TryBillable working for you?

**Body:**
```
Hey [Name]!

You signed up for TryBillable a week ago - I wanted to check in and see how it's going.

Quick question: What's the #1 thing you'd change or improve?

Hit reply and let me know. I read every response personally.

Thanks for being an early user!

[Your Name]
Founder, TryBillable
```

---

## 🎯 Success Metrics (First 30 Days)

### Week 1 Goals
- [ ] 50 signups
- [ ] 20 active users (created at least 1 invoice)
- [ ] 0 critical bugs
- [ ] 3+ pieces of feedback collected

### Week 2 Goals
- [ ] 100 signups
- [ ] 40 active users
- [ ] 5 invoices sent via client portal
- [ ] 1 testimonial collected

### Week 3 Goals
- [ ] 200 signups
- [ ] 80 active users
- [ ] 10+ paid invoices (via Stripe)
- [ ] 3 testimonials collected

### Week 4 Goals
- [ ] 300 signups
- [ ] 120 active users
- [ ] First paying customer (post-beta)
- [ ] Product Hunt top 5 product of the day
- [ ] NPS score >30

---

## 🚨 Launch Blockers (MUST FIX BEFORE LAUNCH)

- [ ] Stripe test payment successful
- [ ] Database migrations applied
- [ ] All environment variables set
- [ ] Legal pages published (Terms + Privacy)
- [ ] Email sending works (test invoice notification)
- [ ] Mobile responsive (test on real phone)
- [ ] Error handling works (try breaking things)
- [ ] Sign up flow works end-to-end

**If all checked:** ✅ YOU'RE READY TO LAUNCH!

---

## 📞 Quick Links

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Deployment:** https://vercel.com/dashboard
- **Product Hunt:** https://producthunt.com
- **This Repo:** /home/dylandombro/Projects/my-ticketing-saas

---

## 💡 Pro Tips

1. **Don't wait for perfection** - 95% is good enough for beta
2. **Talk to users daily** - First 50 users shape your product
3. **Fix bugs fast** - 24-hour response time builds trust
4. **Celebrate small wins** - First signup, first payment, first testimonial
5. **Document everything** - Future you will thank you

---

## 🎉 When You Launch...

Send me a note! I'd love to see TryBillable live.

**Now go get billable!** 💪

---

*Created: October 2, 2025*
*Owner: Dylan Dombro*
