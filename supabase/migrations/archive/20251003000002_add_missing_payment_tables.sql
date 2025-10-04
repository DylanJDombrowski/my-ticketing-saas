-- Simplified Payment Migration
-- Most fields already exist in schema! Just adding missing tables and functions.

-- ==========================================
-- 1. Add Stripe Connect fields to profiles (if missing)
-- ==========================================

DO $$
BEGIN
    -- Add stripe_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'stripe_account_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_id VARCHAR(255);
    END IF;

    -- Add stripe_account_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'stripe_account_status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_status VARCHAR(50) DEFAULT 'none';
    END IF;

    -- Add stripe_onboarding_completed if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_completed'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false;
    END IF;

    -- Add default_payment_instructions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'default_payment_instructions'
    ) THEN
        ALTER TABLE profiles ADD COLUMN default_payment_instructions TEXT;
    END IF;
END $$;

-- ==========================================
-- 2. Create payment_methods table
-- ==========================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL,
    method_name VARCHAR(100),
    instructions TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
CREATE POLICY "Users can view own payment methods"
    ON payment_methods FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
CREATE POLICY "Users can insert own payment methods"
    ON payment_methods FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
CREATE POLICY "Users can update own payment methods"
    ON payment_methods FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;
CREATE POLICY "Users can delete own payment methods"
    ON payment_methods FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ==========================================
-- 3. Create function to mark overdue invoices
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
      AND COALESCE(amount_paid, 0) < total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. Create function to handle partial payments
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
    v_current_paid NUMERIC(10,2);
    v_new_total_paid NUMERIC(10,2);
    v_new_status VARCHAR(20);
BEGIN
    -- Get current invoice info
    SELECT total_amount, COALESCE(amount_paid, 0)
    INTO v_total_amount, v_current_paid
    FROM invoices
    WHERE id = p_invoice_id;

    -- Calculate new total paid
    v_new_total_paid := v_current_paid + p_amount_paid;

    -- Determine new status
    IF v_new_total_paid >= v_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'sent';
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

-- ==========================================
-- 5. Add indexes for better performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent ON invoices(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);

-- ==========================================
-- 6. Add trigger for payment_methods updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Migration Complete
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Payment features migration completed!';
    RAISE NOTICE '   - Added Stripe Connect fields to profiles';
    RAISE NOTICE '   - Created payment_methods table';
    RAISE NOTICE '   - Added payment tracking functions';
    RAISE NOTICE '   - Created indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready to ship! Invoice fields already exist in your schema.';
END $$;
