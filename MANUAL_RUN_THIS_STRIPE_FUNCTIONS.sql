-- ============================================================================
-- MANUAL MIGRATION: Stripe Helper Functions
-- ============================================================================
-- Run this AFTER the first migration in your Supabase SQL Editor
-- ============================================================================

-- Function to increment invoice count for a tenant
CREATE OR REPLACE FUNCTION increment_invoice_count(tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tenants
  SET invoice_count = COALESCE(invoice_count, 0) + 1
  WHERE id = tenant_id;
END;
$$;

-- Function to reset invoice count (useful for testing or when upgrading to paid)
CREATE OR REPLACE FUNCTION reset_invoice_count(tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tenants
  SET invoice_count = 0
  WHERE id = tenant_id;
END;
$$;

-- Trigger to increment invoice_count when a new invoice is created
CREATE OR REPLACE FUNCTION trigger_increment_invoice_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tenants
  SET invoice_count = COALESCE(invoice_count, 0) + 1
  WHERE id = NEW.tenant_id;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_invoice_created ON invoices;

CREATE TRIGGER on_invoice_created
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_increment_invoice_count();

-- Verify functions were created
SELECT proname, prosrc FROM pg_proc
WHERE proname IN ('increment_invoice_count', 'reset_invoice_count', 'trigger_increment_invoice_count');
