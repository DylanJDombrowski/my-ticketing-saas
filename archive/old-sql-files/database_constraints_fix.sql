-- DATABASE INTEGRITY FIX: Add missing NOT NULL constraints and validation
-- This script addresses critical data integrity issues found in the schema audit

-- =============================================================================
-- STEP 1: ADD MISSING NOT NULL CONSTRAINTS
-- =============================================================================

-- profiles.tenant_id must be NOT NULL (critical for multi-tenant isolation)
-- This ensures every user profile belongs to a tenant
ALTER TABLE profiles
ALTER COLUMN tenant_id SET NOT NULL;

-- Add NOT NULL constraints for audit fields (who created records)
-- These are essential for compliance and security auditing

-- Clients created_by field
ALTER TABLE clients
ALTER COLUMN created_by SET NOT NULL;

-- Tickets created_by field
ALTER TABLE tickets
ALTER COLUMN created_by SET NOT NULL;

-- Invoices created_by field
ALTER TABLE invoices
ALTER COLUMN created_by SET NOT NULL;

-- Ticket comments created_by field
ALTER TABLE ticket_comments
ALTER COLUMN created_by SET NOT NULL;

-- =============================================================================
-- STEP 2: ADD UNIQUE CONSTRAINTS FOR BUSINESS LOGIC
-- =============================================================================

-- Invoice numbers must be unique per tenant
-- Prevents duplicate invoice numbers within the same organization
ALTER TABLE invoices
ADD CONSTRAINT invoices_tenant_invoice_number_unique
UNIQUE (tenant_id, invoice_number);

-- Tenant names should be globally unique
-- Prevents confusion and ensures clear tenant identification
ALTER TABLE tenants
ADD CONSTRAINT tenants_name_unique
UNIQUE (name);

-- Client emails must be unique per tenant
-- Prevents duplicate client records within the same organization
-- (This constraint may already exist, adding if not present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'clients_tenant_email_unique'
    ) THEN
        ALTER TABLE clients
        ADD CONSTRAINT clients_tenant_email_unique
        UNIQUE (tenant_id, email);
    END IF;
END $$;

-- =============================================================================
-- STEP 3: ADD CHECK CONSTRAINTS FOR DATA VALIDATION
-- =============================================================================

-- Financial data must be non-negative (prevent negative money amounts)

-- Invoice line items validation
ALTER TABLE invoice_line_items
ADD CONSTRAINT invoice_line_items_rate_positive
CHECK (rate >= 0);

ALTER TABLE invoice_line_items
ADD CONSTRAINT invoice_line_items_amount_positive
CHECK (amount >= 0);

ALTER TABLE invoice_line_items
ADD CONSTRAINT invoice_line_items_hours_positive
CHECK (hours >= 0);

-- Invoice validation
ALTER TABLE invoices
ADD CONSTRAINT invoices_subtotal_positive
CHECK (subtotal >= 0);

ALTER TABLE invoices
ADD CONSTRAINT invoices_tax_rate_valid
CHECK (tax_rate >= 0 AND tax_rate <= 100);

ALTER TABLE invoices
ADD CONSTRAINT invoices_tax_amount_positive
CHECK (tax_amount >= 0);

ALTER TABLE invoices
ADD CONSTRAINT invoices_total_amount_positive
CHECK (total_amount >= 0);

-- Time entries validation
ALTER TABLE time_entries
ADD CONSTRAINT time_entries_hours_positive
CHECK (hours > 0);

-- Client hourly rate validation
ALTER TABLE clients
ADD CONSTRAINT clients_hourly_rate_positive
CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

-- Profile default hourly rate validation
ALTER TABLE profiles
ADD CONSTRAINT profiles_default_hourly_rate_positive
CHECK (default_hourly_rate IS NULL OR default_hourly_rate >= 0);

-- =============================================================================
-- STEP 4: ADD EMAIL FORMAT VALIDATION
-- =============================================================================

-- Ensure email fields contain valid email addresses
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE clients
ADD CONSTRAINT clients_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- =============================================================================
-- STEP 5: ADD ENUM CONSTRAINTS FOR STATUS FIELDS
-- =============================================================================

-- Create invoice status enum to replace varchar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    END IF;
END $$;

-- Update invoice status column to use enum (commented out for safety)
-- This would require data migration, so leaving as future enhancement
-- ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::invoice_status;

-- =============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON CONSTRAINT invoices_tenant_invoice_number_unique ON invoices
IS 'Ensures invoice numbers are unique within each tenant organization';

COMMENT ON CONSTRAINT tenants_name_unique ON tenants
IS 'Ensures tenant organization names are globally unique';

COMMENT ON CONSTRAINT time_entries_hours_positive ON time_entries
IS 'Prevents negative time entries which would be invalid';

COMMENT ON CONSTRAINT profiles_email_format ON profiles
IS 'Validates email address format for user profiles';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that all constraints were added successfully
/*
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN (
    SELECT oid FROM pg_class
    WHERE relname IN ('profiles', 'clients', 'tickets', 'invoices', 'invoice_line_items', 'time_entries', 'tenants')
)
AND conname LIKE '%positive%'
   OR conname LIKE '%unique%'
   OR conname LIKE '%format%'
ORDER BY conrelid, conname;
*/

-- =============================================================================
-- ROLLBACK PLAN (if constraints cause issues)
-- =============================================================================

-- If any constraint causes issues, they can be dropped individually:
-- ALTER TABLE table_name DROP CONSTRAINT constraint_name;

-- For example:
-- ALTER TABLE profiles DROP CONSTRAINT profiles_email_format;
-- ALTER TABLE invoices DROP CONSTRAINT invoices_subtotal_positive;

-- =============================================================================
-- NOTES FOR DEVELOPERS
-- =============================================================================

-- 1. Test all existing data against these constraints before applying
-- 2. Some constraints may fail if existing data violates them
-- 3. Clean up any invalid data before applying constraints
-- 4. Consider adding constraints in separate transactions for rollback safety
-- 5. Monitor application for any constraint violation errors after deployment