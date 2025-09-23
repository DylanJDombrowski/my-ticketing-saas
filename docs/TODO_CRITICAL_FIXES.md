# Critical Fixes TODO List

## 🔴 IMMEDIATE ACTION REQUIRED (Security & Data Integrity)

### Database Security Overhaul
**Priority:** Critical | **Effort:** 2-3 days | **Risk:** High data breach potential

#### Anonymous User Permissions
```sql
-- URGENT: Remove excessive permissions
-- Current state: ALL permissions granted to anon role
-- File: current_schema.sql lines 925-1006

-- TODO: Replace with minimal required permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Grant only what's needed for auth flows
GRANT SELECT ON TABLE auth.users TO anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon;
```

#### API Route Tenant Isolation
**File:** `src/app/api/invoices/[id]/pdf/route.ts`
```typescript
// URGENT: Add tenant check before data access
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // TODO: Get current user's tenant_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // TODO: Add tenant check to query
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)  // CRITICAL: Add this line
    .single();

  // ... rest of function
}
```

#### RLS Policy Fixes
**File:** `current_schema.sql`
```sql
-- TODO: Fix conflicting profile policies (lines 650-658)
-- Current issue: Two conflicting policies on profiles table

-- Remove the conflicting policies
DROP POLICY IF EXISTS "profiles_own_record" ON "public"."profiles";
DROP POLICY IF EXISTS "profiles_own_tenant" ON "public"."profiles";

-- Create single, comprehensive policy
CREATE POLICY "profiles_access" ON "public"."profiles"
FOR ALL TO "authenticated"
USING (
  id = auth.uid() OR
  tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  id = auth.uid() OR
  tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);
```

---

## 🔴 HIGH PRIORITY (Data Integrity)

### Database Constraints
**Priority:** High | **Effort:** 1-2 days | **Risk:** Data corruption

#### Add Missing NOT NULL Constraints
```sql
-- TODO: Add critical NOT NULL constraints
-- File: current_schema.sql

-- Profiles must have tenant_id (line 255)
ALTER TABLE profiles
ALTER COLUMN tenant_id SET NOT NULL;

-- Audit fields should be required
ALTER TABLE clients
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE tickets
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE invoices
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE ticket_comments
ALTER COLUMN created_by SET NOT NULL;
```

#### Add Unique Constraints
```sql
-- TODO: Add business logic constraints

-- Invoice numbers must be unique per tenant
ALTER TABLE invoices
ADD CONSTRAINT invoices_tenant_invoice_number_unique
UNIQUE (tenant_id, invoice_number);

-- Tenant names should be globally unique
ALTER TABLE tenants
ADD CONSTRAINT tenants_name_unique
UNIQUE (name);
```

#### Add Check Constraints
```sql
-- TODO: Add data validation constraints

-- Financial data must be positive
ALTER TABLE invoice_line_items
ADD CONSTRAINT invoice_line_items_rate_positive
CHECK (rate >= 0),
ADD CONSTRAINT invoice_line_items_amount_positive
CHECK (amount >= 0),
ADD CONSTRAINT invoice_line_items_hours_positive
CHECK (hours >= 0);

ALTER TABLE invoices
ADD CONSTRAINT invoices_subtotal_positive
CHECK (subtotal >= 0),
ADD CONSTRAINT invoices_tax_rate_valid
CHECK (tax_rate >= 0 AND tax_rate <= 100),
ADD CONSTRAINT invoices_tax_amount_positive
CHECK (tax_amount >= 0),
ADD CONSTRAINT invoices_total_amount_positive
CHECK (total_amount >= 0);

ALTER TABLE time_entries
ADD CONSTRAINT time_entries_hours_positive
CHECK (hours > 0);

ALTER TABLE clients
ADD CONSTRAINT clients_hourly_rate_positive
CHECK (hourly_rate >= 0);

-- Email format validation
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE clients
ADD CONSTRAINT clients_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

### Atomic Registration Process
**Priority:** High | **Effort:** 1 day | **Risk:** Data inconsistency

#### Fix Registration Transaction
**File:** `src/stores/auth.ts` (lines 80-106)
```typescript
// TODO: Replace with atomic transaction or RPC call
signUp: async (
  email: string,
  password: string,
  tenantName: string,
  firstName?: string,
  lastName?: string
) => {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    notify.error(error.message);
    return { error: error.message };
  }

  if (data.user) {
    // TODO: Use the existing create_user_with_tenant function instead
    // This function already handles the transaction properly
    const { data: result, error: createError } = await supabase.rpc(
      'create_user_with_tenant',
      {
        user_id: data.user.id,
        user_email: email,
        tenant_name: tenantName,
        first_name: firstName,
        last_name: lastName
      }
    );

    if (createError || !result.success) {
      notify.error(createError?.message || result.error);
      return { error: createError?.message || result.error };
    }

    // Fetch complete profile with tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        *,
        tenant:tenants(*)
      `)
      .eq("id", data.user.id)
      .single();

    set({ user: data.user, profile });
    notify.success("Account created successfully");
  }

  return {};
},
```

---

## 🟠 HIGH PRIORITY (Critical Features)

### Fix ESLint Configuration
**Priority:** High | **Effort:** 2-4 hours | **Risk:** Code quality degradation

#### Package.json Fix
**File:** `package.json` (line 9)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx --fix",
    "lint:check": "eslint . --ext .ts,.tsx"
  }
}
```

#### ESLint Configuration
**Create:** `eslint.config.mjs`
```javascript
// TODO: Replace broken configuration
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "error",
      "no-console": "warn"
    }
  }
];

export default eslintConfig;
```

### Complete Reports Implementation
**Priority:** High | **Effort:** 3-5 days | **Risk:** Missing core functionality

#### Reports Page Implementation
**File:** `src/app/dashboard/reports/page.tsx`
```typescript
// TODO: Replace placeholder with real implementation
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { createBrowserClient } from "@/lib/supabase";

interface ReportData {
  totalRevenue: number;
  billableHours: number;
  activeClients: number;
  resolvedTickets: number;
  monthlyGrowth: {
    revenue: number;
    hours: number;
    clients: number;
    tickets: number;
  };
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchReportData();
    }
  }, [profile?.tenant_id]);

  const fetchReportData = async () => {
    // TODO: Implement real data fetching
    const supabase = createBrowserClient();

    try {
      // Fetch invoice totals
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, created_at")
        .eq("tenant_id", profile!.tenant_id)
        .eq("status", "paid");

      // Fetch billable hours
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("hours, created_at")
        .eq("tenant_id", profile!.tenant_id)
        .eq("is_billable", true);

      // TODO: Calculate actual metrics from real data
      // This replaces the hardcoded values

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // TODO: Add charts and visualizations
  // TODO: Add date range filtering
  // TODO: Add export functionality

  return (
    // Implement real reports UI
  );
}
```

---

## 🟡 MEDIUM PRIORITY (Performance & UX)

### Database Performance
**Priority:** Medium | **Effort:** 1-2 days | **Risk:** Slow queries

#### Add Missing Indexes
```sql
-- TODO: Add performance indexes
-- File: current_schema.sql (add to end)

-- Invoice queries by date ranges
CREATE INDEX idx_invoices_due_date ON invoices (tenant_id, due_date);
CREATE INDEX idx_invoices_created_at ON invoices (tenant_id, created_at);

-- Time entry queries by date
CREATE INDEX idx_time_entries_entry_date ON time_entries (tenant_id, entry_date);
CREATE INDEX idx_time_entries_billable ON time_entries (tenant_id, is_billable);

-- Ticket management queries
CREATE INDEX idx_tickets_assigned_to ON tickets (assigned_to);
CREATE INDEX idx_tickets_priority ON tickets (tenant_id, priority);
CREATE INDEX idx_tickets_due_date ON tickets (tenant_id, due_date);

-- Profile lookups
CREATE INDEX idx_profiles_email ON profiles (email);
CREATE INDEX idx_profiles_tenant_id ON profiles (tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_tickets_status_client ON tickets (tenant_id, status, client_id);
CREATE INDEX idx_time_entries_user_date ON time_entries (tenant_id, user_id, entry_date);
```

### Supabase Client Consistency
**Priority:** Medium | **Effort:** 2-3 hours | **Risk:** Performance overhead

#### Standardize Client Usage
**Files:** All stores in `src/stores/`
```typescript
// TODO: Use consistent pattern across all stores

// Good pattern (from clients.ts):
const supabase = createBrowserClient(); // Outside the store

export const useStoreExample = create<State>((set) => ({
  // Use the shared instance
}));

// Bad pattern (from tickets.ts):
export const useTicketsStore = create<State>((set) => ({
  fetchTickets: async () => {
    const supabase = createBrowserClient(); // New instance each call
    // TODO: Move to shared instance
  }
}));
```

### Error Handling Improvement
**Priority:** Medium | **Effort:** 1 day | **Risk:** Poor UX

#### Replace Console Logging
**Files:** Multiple files (see grep results)
```typescript
// TODO: Replace all console.error with proper error handling

// Current pattern:
console.error("Error fetching data:", error);

// TODO: Replace with:
import { logError } from '@/lib/error-handling';

try {
  // operation
} catch (error) {
  logError('Operation failed', {
    operation: 'fetchData',
    tenantId: profile?.tenant_id,
    error
  });
  notify.error('Unable to load data. Please try again.');
}
```

---

## ✅ Completion Criteria

### Phase 1 (Critical) - Complete When:
- [ ] Anonymous database permissions removed
- [ ] All API routes have tenant checks
- [ ] Registration process is atomic
- [ ] All critical database constraints added
- [ ] ESLint configuration fixed

### Phase 2 (High Priority) - Complete When:
- [ ] Reports page shows real data
- [ ] All database indexes added
- [ ] Supabase client usage standardized
- [ ] Error handling improved

### Testing Requirements:
- [ ] Manual security testing of all fixed vulnerabilities
- [ ] Database constraint testing with invalid data
- [ ] Registration flow testing with failure scenarios
- [ ] Performance testing of indexed queries

---

**Last Updated:** 2025-09-22
**Owner:** Development Team
**Review Schedule:** Daily standup until Phase 1 complete