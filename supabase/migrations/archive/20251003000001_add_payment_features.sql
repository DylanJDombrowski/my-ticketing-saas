-- Migration: Add Payment Features (Stripe Connect + Manual Payments)
-- Created: 2025-10-03
-- Purpose: Enable users to receive payments via Stripe Connect or manual methods

-- ==========================================
-- 1. Add Stripe Connect fields to profiles
-- ==========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_payment_instructions TEXT;

COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect account ID for receiving payments';
COMMENT ON COLUMN profiles.stripe_account_status IS 'Status: none, pending, active, restricted';
COMMENT ON COLUMN profiles.stripe_onboarding_completed IS 'Whether user completed Stripe onboarding';
COMMENT ON COLUMN profiles.default_payment_instructions IS 'Default manual payment instructions (bank, Venmo, etc.)';

-- ==========================================
-- 2. Add payment fields to invoices
-- ==========================================

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sent_to_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN invoices.payment_method IS 'Payment method: stripe, manual, wire, check, crypto, other';
COMMENT ON COLUMN invoices.payment_instructions IS 'Manual payment instructions specific to this invoice';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN invoices.stripe_checkout_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN invoices.sent_at IS 'When invoice was sent to client';
COMMENT ON COLUMN invoices.sent_to_email IS 'Email address invoice was sent to';
COMMENT ON COLUMN invoices.paid_at IS 'When invoice was fully paid';
COMMENT ON COLUMN invoices.amount_paid IS 'Amount paid so far (for partial payments)';

-- ==========================================
-- 3. Add 'partial' status to invoice_status enum
-- ==========================================

-- Check if 'partial' already exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'partial'
        AND enumtypid = 'invoice_status'::regtype
    ) THEN
        ALTER TYPE invoice_status ADD VALUE 'partial';
    END IF;
END $$;

-- ==========================================
-- 4. Create payment_methods table (for multiple manual payment options)
-- ==========================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'bank', 'venmo', 'paypal', 'zelle', 'crypto', 'check', 'wire', 'other'
    method_name VARCHAR(100), -- e.g., "Chase Business Account", "Personal Venmo"
    instructions TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE payment_methods IS 'Manual payment methods configured by users';
COMMENT ON COLUMN payment_methods.method_type IS 'Type of payment method';
COMMENT ON COLUMN payment_methods.instructions IS 'Instructions for client to pay using this method';
COMMENT ON COLUMN payment_methods.is_default IS 'Whether this is the default payment method for new invoices';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view own payment methods"
    ON payment_methods FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment methods"
    ON payment_methods FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
    ON payment_methods FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
    ON payment_methods FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ==========================================
-- 5. Create stripe_connect_accounts table (for tracking Stripe setup)
-- ==========================================

CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
    account_status VARCHAR(50) DEFAULT 'pending', -- pending, active, restricted, disabled
    details_submitted BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    country VARCHAR(2), -- ISO country code
    currency VARCHAR(3), -- ISO currency code
    business_type VARCHAR(50), -- individual, company, non_profit, government_entity
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    last_synced_at TIMESTAMP
);

COMMENT ON TABLE stripe_connect_accounts IS 'Tracks Stripe Connect account setup and status';
COMMENT ON COLUMN stripe_connect_accounts.account_status IS 'Stripe account status from API';
COMMENT ON COLUMN stripe_connect_accounts.details_submitted IS 'Whether user completed Stripe onboarding';
COMMENT ON COLUMN stripe_connect_accounts.charges_enabled IS 'Can accept payments';
COMMENT ON COLUMN stripe_connect_accounts.payouts_enabled IS 'Can receive payouts';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_tenant ON stripe_connect_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_connect_accounts(stripe_account_id);

-- Enable RLS
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_connect_accounts
CREATE POLICY "Users can view own Stripe account"
    ON stripe_connect_accounts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own Stripe account"
    ON stripe_connect_accounts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own Stripe account"
    ON stripe_connect_accounts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 6. Create function to automatically mark overdue invoices
-- ==========================================

CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue',
        updated_at = now()
    WHERE status = 'sent'
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
      AND amount_paid < total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_overdue_invoices() IS 'Automatically marks invoices as overdue if past due date';

-- ==========================================
-- 7. Create function to handle partial payments
-- ==========================================

CREATE OR REPLACE FUNCTION update_invoice_payment(
    p_invoice_id UUID,
    p_amount_paid NUMERIC(10,2),
    p_payment_method VARCHAR(50) DEFAULT 'stripe',
    p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_total_amount NUMERIC(10,2);
    v_new_total_paid NUMERIC(10,2);
    v_new_status invoice_status;
BEGIN
    -- Get current invoice total
    SELECT total_amount, COALESCE(amount_paid, 0) + p_amount_paid
    INTO v_total_amount, v_new_total_paid
    FROM invoices
    WHERE id = p_invoice_id;

    -- Determine new status
    IF v_new_total_paid >= v_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'sent'; -- Keep as sent if no payment
    END IF;

    -- Update invoice
    UPDATE invoices
    SET
        amount_paid = v_new_total_paid,
        status = v_new_status,
        payment_method = COALESCE(p_payment_method, payment_method),
        stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
        paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
        updated_at = now()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_invoice_payment IS 'Updates invoice with payment info and handles partial payments';

-- ==========================================
-- 8. Add indexes for better performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent ON invoices(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);

-- ==========================================
-- 9. Add updated_at trigger for new tables
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_accounts_updated_at
    BEFORE UPDATE ON stripe_connect_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Migration Complete
-- ==========================================

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Payment features migration completed successfully!';
    RAISE NOTICE 'Added: Stripe Connect support, manual payment methods, partial payment status';
END $$;
