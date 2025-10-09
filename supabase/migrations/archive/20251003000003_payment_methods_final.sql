-- Final Payment Methods Migration
-- Fixes: user_id should reference profile_id (profiles.id)

-- ==========================================
-- 1. Drop existing payment_methods table if it exists (from previous failed migration)
-- ==========================================

DROP TABLE IF EXISTS payment_methods CASCADE;

-- ==========================================
-- 2. Create payment_methods table with correct column name
-- ==========================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'bank', 'venmo', 'paypal', 'zelle', 'crypto', 'check'
    method_name VARCHAR(100), -- e.g., "Chase Business Account"
    instructions TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE payment_methods IS 'Manual payment methods configured by users';
COMMENT ON COLUMN payment_methods.profile_id IS 'References profiles.id (the user)';
COMMENT ON COLUMN payment_methods.method_type IS 'Type: bank, venmo, paypal, zelle, crypto, check, wire, other';
COMMENT ON COLUMN payment_methods.instructions IS 'Instructions for client to pay using this method';

-- ==========================================
-- 3. Create indexes
-- ==========================================

CREATE INDEX idx_payment_methods_profile ON payment_methods(profile_id);
CREATE INDEX idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(profile_id, is_default) WHERE is_default = true;

-- ==========================================
-- 4. Enable RLS
-- ==========================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. Create RLS Policies
-- ==========================================

CREATE POLICY "Users can view own payment methods"
    ON payment_methods FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own payment methods"
    ON payment_methods FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
    ON payment_methods FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
    ON payment_methods FOR DELETE
    TO authenticated
    USING (profile_id = auth.uid());

-- ==========================================
-- 6. Add trigger for updated_at
-- ==========================================

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Migration Complete
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Payment methods table created successfully!';
    RAISE NOTICE '   - Using profile_id (references profiles.id)';
    RAISE NOTICE '   - RLS policies configured';
    RAISE NOTICE '   - Indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to test invoice workflow!';
END $$;
