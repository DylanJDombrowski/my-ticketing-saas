-- Migration: Remove approvals and SLA features
-- This simplifies the app for solo devs, freelancers, and consultants
-- Focus: "Get paid faster" - removing unnecessary complexity

-- Drop SLA rules table entirely
DROP TABLE IF EXISTS public.sla_rules CASCADE;

-- Remove approval_status from time_entries
ALTER TABLE public.time_entries
DROP COLUMN IF EXISTS approval_status CASCADE;

-- Remove approval_status from invoices
ALTER TABLE public.invoices
DROP COLUMN IF EXISTS approval_status CASCADE;

-- Drop related indexes if they exist
DROP INDEX IF EXISTS public.idx_time_entries_approval_status;
DROP INDEX IF EXISTS public.idx_invoices_approval_status;
DROP INDEX IF EXISTS public.idx_sla_rules_tenant_id;

-- Note: RLS policies and grants are automatically cleaned up with CASCADE
