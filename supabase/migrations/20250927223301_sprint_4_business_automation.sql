-- Sprint 4: Business Logic & Automation Migration
-- Adds automation features for invoice generation, notifications, client portal, and workflow approvals

-- ============================================================================
-- INVOICE AUTOMATION FEATURES
-- ============================================================================

-- Add invoice automation columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- TIME ENTRY APPROVAL WORKFLOW
-- ============================================================================

-- Add approval workflow columns to time entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'submitted';
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- SLA MONITORING SYSTEM
-- ============================================================================

-- SLA rules configuration table
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

-- ============================================================================
-- CLIENT PORTAL ACCESS
-- ============================================================================

-- Client portal access tokens table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  access_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Email notifications log table
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

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- SLA rules indexes
CREATE INDEX IF NOT EXISTS idx_sla_rules_tenant_id ON sla_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_rules_client_id ON sla_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_sla_rules_priority ON sla_rules(ticket_priority);
CREATE INDEX IF NOT EXISTS idx_sla_rules_active ON sla_rules(tenant_id, is_active);

-- Client portal access indexes
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client_id ON client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_active ON client_portal_access(is_active, expires_at);

-- Notification log indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_tenant_id ON notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

-- Time entry approval indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by) WHERE approved_by IS NOT NULL;

-- Invoice approval indexes
CREATE INDEX IF NOT EXISTS idx_invoices_approval_status ON invoices(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoices_approved_by ON invoices(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_next_run ON invoices(next_run_at) WHERE next_run_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- SLA rules policies
CREATE POLICY "sla_rules_tenant_policy" ON sla_rules
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Client portal access policies
CREATE POLICY "client_portal_access_tenant_policy" ON client_portal_access
  TO authenticated
  USING (client_id IN (
    SELECT id FROM clients
    WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (client_id IN (
    SELECT id FROM clients
    WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

-- Notification log policies
CREATE POLICY "notification_log_tenant_policy" ON notification_log
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Add updated_at trigger for new tables
CREATE OR REPLACE TRIGGER update_sla_rules_updated_at
  BEFORE UPDATE ON sla_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Function to generate secure tokens for client portal
CREATE OR REPLACE FUNCTION generate_client_portal_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Function to create client portal access
CREATE OR REPLACE FUNCTION create_client_portal_access(
  p_client_id UUID,
  p_expires_in_days INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token TEXT;
  client_tenant_id UUID;
  user_tenant_id UUID;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO user_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get client's tenant_id
  SELECT tenant_id INTO client_tenant_id
  FROM clients
  WHERE id = p_client_id;

  -- Check if user can access this client
  IF user_tenant_id != client_tenant_id THEN
    RAISE EXCEPTION 'Access denied to client';
  END IF;

  -- Generate new token
  new_token := generate_client_portal_token();

  -- Deactivate existing tokens for this client
  UPDATE client_portal_access
  SET is_active = false
  WHERE client_id = p_client_id;

  -- Create new access token
  INSERT INTO client_portal_access (
    client_id,
    access_token,
    expires_at,
    is_active
  ) VALUES (
    p_client_id,
    new_token,
    now() + (p_expires_in_days || ' days')::interval,
    true
  );

  RETURN new_token;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_client_portal_token() TO authenticated;
GRANT EXECUTE ON FUNCTION create_client_portal_access(UUID, INTEGER) TO authenticated;