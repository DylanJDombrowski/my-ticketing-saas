-- Production-aligned migration
-- Based on actual production schema from dump.sql
-- Only adds performance optimizations and missing RLS policies

-- ============================================================================
-- PERFORMANCE INDEXES (PRODUCTION SCHEMA ALIGNED)
-- ============================================================================

-- Core performance indexes for existing columns
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_active ON clients(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_created ON tickets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON tickets(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket_id ON time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_date ON time_entries(tenant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_time_entry_id ON invoice_line_items(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_tenant_id ON ticket_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_by ON ticket_comments(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies
-- Tenants policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Clients policies
DROP POLICY IF EXISTS "Users can manage their tenant's clients" ON clients;
CREATE POLICY "Users can manage their tenant's clients" ON clients
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Tickets policies
DROP POLICY IF EXISTS "Users can manage their tenant's tickets" ON tickets;
CREATE POLICY "Users can manage their tenant's tickets" ON tickets
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Time entries policies
DROP POLICY IF EXISTS "Users can manage their tenant's time entries" ON time_entries;
CREATE POLICY "Users can manage their tenant's time entries" ON time_entries
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Invoices policies
DROP POLICY IF EXISTS "Users can manage their tenant's invoices" ON invoices;
CREATE POLICY "Users can manage their tenant's invoices" ON invoices
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Invoice line items policies
DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
    )
  );

-- Ticket comments policies (using created_by instead of user_id)
DROP POLICY IF EXISTS "Users can manage ticket comments" ON ticket_comments;
CREATE POLICY "Users can manage ticket comments" ON ticket_comments
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Payment methods policies
DROP POLICY IF EXISTS "Users can manage their tenant's payment methods" ON payment_methods;
CREATE POLICY "Users can manage their tenant's payment methods" ON payment_methods
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables that have updated_at columns
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PRODUCTION MIGRATION COMPLETE
-- ============================================================================