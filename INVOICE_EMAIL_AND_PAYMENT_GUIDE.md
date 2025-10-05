# Invoice Email & Payment Guide

## Issues Fixed ✅

### 1. Email Sending 404 Error - FIXED

**Problem:** API was looking for `issue_date` column that doesn't exist in database
**Solution:** Changed to use `created_at` instead

The invoice email will now send successfully!

---

## How to Use Invoice Features

### Sending Invoice Emails

1. **Create an invoice** (draft status)
2. **Click the ⋮ (three dots)** on the invoice row
3. **Click "Send Invoice"** (only visible when status = 'draft')
4. Email will be sent to the client's email address
5. Status automatically changes to "sent"

### Pay Invoice Button Visibility

The **"Pay with Card"** button appears in the dropdown menu when:

✅ Invoice status is: `sent`, `overdue`, or `partial`

❌ Button is HIDDEN when status is:
- `draft` - Invoice not sent yet
- `paid` - Already paid
- `cancelled` - Cancelled invoice

### Where to Find Pay Invoice Button

**Option 1: Invoices Page Dropdown**
1. Go to Dashboard → Invoices
2. Find invoice with status "sent" or "overdue"
3. Click **⋮ (three dots)** menu on the right
4. Click **"Pay with Card"** (has credit card icon)

**Option 2: Change Status First**
If you're testing and the invoice is "draft":
1. Click ⋮ menu
2. Click "Send Invoice" first (changes to "sent")
3. Now "Pay with Card" will appear in the menu

---

## Invoice Status Flow

```
draft → sent → paid
  ↓       ↓
  ↓    overdue (if past due date)
  ↓       ↓
  ↓    partial (if partially paid)
  ↓       ↓
cancelled   paid
```

### Status-Based Actions:

| Status | Available Actions |
|--------|------------------|
| **draft** | • Send Invoice<br>• View PDF<br>• Download PDF<br>• Delete Invoice |
| **sent** | • Pay with Card ✨<br>• Mark as Paid<br>• View PDF<br>• Download PDF<br>• Delete Invoice |
| **overdue** | • Pay with Card ✨<br>• Mark as Paid<br>• View PDF<br>• Download PDF<br>• Delete Invoice |
| **partial** | • Pay with Card ✨<br>• Mark as Paid<br>• View PDF<br>• Download PDF<br>• Delete Invoice |
| **paid** | • View PDF<br>• Download PDF<br>• Delete Invoice |

---

## Testing Payment Flow

### Step-by-Step Test:

1. **Create Test Client**
   - Go to Clients
   - Add client with valid email

2. **Create Test Invoice**
   - Go to Invoices → "Create Invoice" tab
   - Select client
   - Add time entries or manual line items
   - Click "Create Invoice"

3. **Send Invoice**
   - Find the invoice (status: draft)
   - Click ⋮ → "Send Invoice"
   - Confirm send
   - Status changes to "sent"

4. **Pay Invoice**
   - Click ⋮ again (on same invoice)
   - Now you'll see "Pay with Card" option
   - Click it
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
   - Status changes to "paid"

---

## Email Features

When you send an invoice, the client receives:

✅ **Professional email with:**
- Invoice number
- Issue date (uses created_at)
- Due date (if set)
- Total amount
- "View Invoice PDF" button
- Company branding

✅ **Automatic status tracking:**
- `sent_at` timestamp recorded
- `sent_to_email` stored
- Status updated to "sent"

---

## Troubleshooting

### "Invoice not found" error
- ✅ FIXED - Was trying to select non-existent `issue_date` column
- Now uses `created_at` instead

### Can't see "Pay with Card" button
- Check invoice status (must be: sent, overdue, or partial)
- If status is "draft", send invoice first
- If status is "paid", invoice already paid

### Email not sending
- Verify `RESEND_API_KEY` is set in environment
- Check `RESEND_FROM_EMAIL` is configured
- Verify client has valid email address
- Check Resend dashboard for delivery logs

### Payment not working
- Verify Stripe is connected (Settings → Payments)
- Check Stripe account is active (charges enabled)
- Ensure `STRIPE_SECRET_KEY` is set
- Test with card: `4242 4242 4242 4242`

---

## Quick Reference

### Resend Environment Variables
```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=invoices@trybillable.com
```

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
Expiry: Any future date
CVC: Any 3 digits
```

### Invoice Statuses for Payment
- ✅ `sent` - Shows "Pay with Card"
- ✅ `overdue` - Shows "Pay with Card"
- ✅ `partial` - Shows "Pay with Card"
- ❌ `draft` - Must send first
- ❌ `paid` - Already completed

---

**Everything is now working!** Email sending is fixed, and you know exactly when/where to find the Pay Invoice button.
