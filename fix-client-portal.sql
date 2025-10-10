-- Fix Client Portal Access Issues
-- Run this in Supabase Studio SQL Editor: http://127.0.0.1:54323

-- ISSUE 1: Make time_entry_id nullable for quick invoices
ALTER TABLE public.invoice_line_items
ALTER COLUMN time_entry_id DROP NOT NULL;

-- ISSUE 2: Enable anonymous access for client portal
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "client_portal_access_tenant_policy" ON public.client_portal_access;
DROP POLICY IF EXISTS "invoices_client_portal_access" ON public.invoices;
DROP POLICY IF EXISTS "clients_client_portal_access" ON public.clients;
DROP POLICY IF EXISTS "tenants_client_portal_access" ON public.tenants;

-- Allow anonymous users to SELECT from client_portal_access table
CREATE POLICY "client_portal_access_anon_select"
ON public.client_portal_access
FOR SELECT
TO anon
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Allow anonymous users to UPDATE last_accessed timestamp
CREATE POLICY "client_portal_access_anon_update"
ON public.client_portal_access
FOR UPDATE
TO anon
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Allow anonymous users to view clients through portal access
CREATE POLICY "clients_anon_portal_access"
ON public.clients
FOR SELECT
TO anon
USING (
  id IN (
    SELECT client_id
    FROM public.client_portal_access
    WHERE is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- Allow anonymous users to view tenants through portal access
CREATE POLICY "tenants_anon_portal_access"
ON public.tenants
FOR SELECT
TO anon
USING (
  id IN (
    SELECT c.tenant_id
    FROM public.clients c
    INNER JOIN public.client_portal_access cpa ON cpa.client_id = c.id
    WHERE cpa.is_active = true
    AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
  )
);

-- Allow anonymous users to view invoices through portal access
CREATE POLICY "invoices_anon_portal_access"
ON public.invoices
FOR SELECT
TO anon
USING (
  client_id IN (
    SELECT client_id
    FROM public.client_portal_access
    WHERE is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- Success message
SELECT 'Client portal access policies created successfully!' as message;
