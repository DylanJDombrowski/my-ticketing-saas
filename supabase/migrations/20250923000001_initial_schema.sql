-- Initial schema creation
-- This creates the complete database schema from current_schema.sql

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    "priority" TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    "due_date" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TIME ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "ticket_id" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "entry_date" DATE NOT NULL,
    "hours" NUMERIC(5,2) NOT NULL CHECK (hours > 0),
    "description" TEXT,
    "is_billable" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    "invoice_number" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    "subtotal" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "tax_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, invoice_number)
);

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "invoice_id" UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    "time_entry_id" UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    "description" TEXT NOT NULL,
    "quantity" NUMERIC(8,2) NOT NULL DEFAULT 1,
    "rate" NUMERIC(10,2) NOT NULL,
    "amount" NUMERIC(10,2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- TICKET COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "ticket_id" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK (type IN ('bank_transfer', 'credit_card', 'paypal', 'check', 'cash', 'other')),
    "details" JSONB,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- BASIC INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
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

-- Ticket comments policies
DROP POLICY IF EXISTS "Users can manage ticket comments" ON ticket_comments;
CREATE POLICY "Users can manage ticket comments" ON ticket_comments
  FOR ALL USING (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
    )
  );

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

-- Add triggers for all tables with updated_at columns
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

-- Function to handle user creation and tenant assignment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id UUID;
BEGIN
  -- Create a new tenant for the user if they don't have one
  IF NEW.raw_user_meta_data->>'tenant_id' IS NULL THEN
    INSERT INTO tenants (name, created_at, updated_at)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      NOW(),
      NOW()
    )
    RETURNING id INTO tenant_id;
  ELSE
    tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  END IF;

  -- Create the user profile
  INSERT INTO profiles (
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();