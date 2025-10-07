# Invoice Email & Client Portal Setup

Complete guide for invoice emails, client portal links, and payment processing.

## 🚀 Quick Start

### Environment Variables Required

```bash
# Resend (for email)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=invoices@trybillable.com

# Stripe (for payments)  
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 📧 Invoice Email Features (NEW - 2025-10-06)

### What Clients Receive

When you send an invoice, clients get:

1. **💳 "Pay This Invoice" Button** - Direct payment link
2. **📊 "View Client Portal" Button** - Access all invoices/tasks
3. **📄 "Download PDF" Link** - Printable invoice
4. **ℹ️ Portal Info** - Explanation of portal access

### Portal Access

- Auto-generated 30-day secure token
- No login required (magic link)
- Access to all their invoices, tasks, payment history

---

## 📋 How to Send an Invoice

1. Create invoice (status: draft)
2. Click ⋮ → "Send Invoice"
3. Review modal with explanation
4. Confirm send
5. Client receives email with portal + payment links

---

## 🧪 Testing

**Test Card:** 4242 4242 4242 4242

1. Create test client with your email
2. Create invoice
3. Send invoice  
4. Check email
5. Click "Pay This Invoice" to test payment
6. Click "View Client Portal" to see portal

---

## 🔧 Troubleshooting

### Email not sending
- Check RESEND_API_KEY is set
- Verify client has valid email
- Check Resend dashboard for errors

### Portal link not working
- Verify NEXT_PUBLIC_APP_URL is correct
- Check token in client_portal_access table
- Ensure token hasn't expired

### Payment not working
- Verify Stripe Connect configured
- Check Stripe test mode enabled
- See [STRIPE_SETUP.md](./STRIPE_SETUP.md)

---

## 📚 Related Docs

- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe configuration
- [PAYMENT_WORKFLOW.md](./PAYMENT_WORKFLOW.md) - Payment flow
- [RESEND_SETUP.md](./RESEND_SETUP.md) - Email setup

