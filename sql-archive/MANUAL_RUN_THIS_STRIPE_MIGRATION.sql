-- ============================================================================
-- MANUAL MIGRATION: Add Stripe Subscription Support to Tenants
-- ============================================================================
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zpplkvwykqvwdzuvjdwz/sql
-- ============================================================================

-- Add Stripe subscription fields to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_limit INTEGER DEFAULT 2;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- Add helpful comments
COMMENT ON COLUMN tenants.subscription_status IS 'Stripe subscription status: free, active, past_due, canceled, incomplete, trialing';
COMMENT ON COLUMN tenants.invoice_count IS 'Number of invoices created by tenant (resets on subscription)';
COMMENT ON COLUMN tenants.invoice_limit IS 'Maximum invoices allowed (2 for free, unlimited for paid)';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'invoice_count', 'invoice_limit')
ORDER BY ordinal_position;
