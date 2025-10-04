# Resend Email Setup Guide

## Quick Start

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your account

### 2. Get API Key
1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it (e.g., "Production" or "My Ticketing SaaS")
4. Copy the API key (starts with `re_`)

### 3. Configure Domain (Required for Production)
**Option A: Use your own domain (recommended)**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown to your domain provider:
   - **MX record** (for receiving bounces)
   - **TXT record** (for SPF verification)
   - **DKIM records** (2 CNAME records for authentication)
5. Click **Verify DNS Records**
6. Once verified, emails will send from `noreply@yourdomain.com`

**Option B: Use Resend test domain (development only)**
- For testing, you can send to **your own verified email addresses**
- Test emails send from `onboarding@resend.dev`
- Limited to 100 emails/day

### 4. Environment Variables

Add these to your `.env.local` (for local dev) and Vercel (for production):

```bash
# Resend API Key (required)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# From Email Address (required)
# Use your verified domain or resend test domain
RESEND_FROM_EMAIL=invoices@yourdomain.com
# OR for testing:
# RESEND_FROM_EMAIL=onboarding@resend.dev

# App URL for PDF links (required for production)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# OR for local testing:
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Add to Vercel

**In your Vercel project:**
1. Go to **Settings** → **Environment Variables**
2. Add these variables:
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `RESEND_FROM_EMAIL` = `invoices@yourdomain.com`
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
3. Click **Save**
4. Redeploy your app

### 6. Test Locally

```bash
# Add to .env.local
RESEND_API_KEY=re_your_test_key
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Restart dev server
npm run dev
```

**To test:**
1. Create a client with your email address
2. Create a ticket for that client
3. Log some time
4. Create an invoice
5. Click **Send Invoice** in the ... menu
6. Check your email!

## What's Been Implemented

### Email Features
✅ Beautiful HTML email template with:
- Invoice number and details
- Client name personalization
- Amount due highlighted
- Direct link to PDF
- Your company branding (tenant name)

✅ Automatic invoice status updates:
- Sets status to "sent"
- Records `sent_at` timestamp
- Stores `sent_to_email`

✅ Error handling:
- Shows toast notifications for success/failure
- Logs detailed errors to console
- Graceful fallback if email fails

### Files Modified
- **API Route**: `/src/app/api/invoices/send-email/route.ts` - Handles email sending
- **Store**: `/src/stores/invoices.ts` - Updated `sendInvoice()` to call API
- **Package**: Added `resend` npm package

## Email Template Preview

The email includes:
- **Header**: Purple gradient with invoice number
- **Greeting**: Personalized with client name
- **Invoice Details**: Number, dates, amount, company
- **Amount Due**: Large, prominent display
- **View PDF Button**: Direct link to download
- **Footer**: Company branding

## Pricing

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day
- All features included
- No credit card required

**Paid Plans:**
- Pro: $20/month for 50,000 emails
- Scale: Custom pricing for high volume

## Troubleshooting

### "Unauthorized" Error
- Check `RESEND_API_KEY` is set correctly
- Make sure you copied the full key (starts with `re_`)
- Verify the key is active in Resend dashboard

### "Email not sending"
- Verify your domain in Resend (for production)
- For testing, recipient must be a verified email address
- Check Resend dashboard logs for details

### "PDF not loading in email"
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Make sure your app is deployed and accessible
- PDF route must be publicly accessible

### "From email rejected"
- Use a verified domain or Resend test domain
- Don't use Gmail/Yahoo/other personal email addresses
- Complete DNS verification for your domain

## Next Steps

After email is working:
1. ✅ Test with real invoices
2. 🔄 Set up Stripe Connect (payment processing)
3. 🔄 Add payment reminders for overdue invoices
4. 🔄 Add read receipts/tracking (Resend Pro feature)

---

**Ready for production:** Just add your Resend API key and verified domain to Vercel environment variables!
