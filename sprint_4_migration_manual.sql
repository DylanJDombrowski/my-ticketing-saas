-- SPRINT 4 MIGRATION - Copy and paste this into Supabase SQL Editor
-- This adds all the automation features needed for Sprint 4

-- Add invoice automation columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add time entry approval columns
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'submitted';
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- SLA rules table
CREATE TABLE IF NOT EXISTS sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ticket_priority ticket_priority NOT NULL,
  response_time_hours INTEGER,
  resolution_time_hours INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client portal access table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  access_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  subject TEXT,
  message_body TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sla_rules_tenant_id ON sla_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client_id ON client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_tenant_id ON notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoices_approval_status ON invoices(approval_status);

-- Enable RLS
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "sla_rules_tenant_policy" ON sla_rules
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "client_portal_access_tenant_policy" ON client_portal_access
  TO authenticated
  USING (client_id IN (
    SELECT id FROM clients
    WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "notification_log_tenant_policy" ON notification_log
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Helper function for client portal tokens
CREATE OR REPLACE FUNCTION generate_client_portal_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;