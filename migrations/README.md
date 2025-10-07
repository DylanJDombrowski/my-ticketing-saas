# Database Migration: Tickets to Tasks

✅ **Status: COMPLETED** (October 7, 2025)

This migration successfully renamed the `tickets` table to `tasks` along with all related constraints, indexes, and policies.

## Migration Summary

- **Migration Script Used:** `rename_tickets_to_tasks_safe.sql`
- **Result:** ✅ Successful
- **Date:** October 7, 2025

## What Was Changed

### Database Changes
1. **Tables Renamed:**
   - `tickets` → `tasks`
   - `ticket_comments` → `task_comments`

2. **Constraints Updated:**
   - `tickets_pkey` → `tasks_pkey`
   - `tickets_tenant_id_fkey` → `tasks_tenant_id_fkey`
   - `tickets_client_id_fkey` → `tasks_client_id_fkey`
   - `tickets_assigned_to_fkey` → `tasks_assigned_to_fkey`
   - `tickets_created_by_fkey` → `tasks_created_by_fkey`
   - Similar updates for `task_comments` constraints

3. **Indexes Recreated:**
   - `idx_tasks_tenant_id`
   - `idx_tasks_client_id`
   - `idx_tasks_status`
   - `idx_tasks_assigned_to`
   - `idx_tasks_created_at`
   - `idx_task_comments_tenant_id`
   - `idx_task_comments_task_id`

4. **RLS Policies Updated:**
   - Old `tickets_*` policies removed
   - New `tasks_*` policies created (select, insert, update, delete)
   - Old `ticket_comments_*` policies removed
   - New `task_comments_*` policies created

5. **Triggers Updated:**
   - `update_tasks_updated_at`
   - `update_task_comments_updated_at`

### Code Changes (Completed)
All code references have been updated from `tickets` to `tasks`:
- ✅ `src/stores/tasks.ts` - All CRUD operations
- ✅ `src/components/sla-monitor.tsx` - SLA tracking
- ✅ `src/stores/clients.ts` - Client deletion logic
- ✅ `src/app/api/client-portal/[token]/route.ts` - Client portal
- ✅ `src/app/api/invoices/auto-generate/route.ts` - Invoice generation
- ✅ `src/app/dashboard/reports/page.tsx` - Reporting
- ✅ `src/app/dashboard/page.tsx` - Dashboard stats
- ✅ `src/components/time-tracker.tsx` - Time tracking
- ✅ All other components and pages

## Files

- **Active Migration Script:** `rename_tickets_to_tasks_safe.sql` - Safe idempotent version with checks
- **Archived:** `archive/rename_tickets_to_tasks.sql` - Original version (no longer needed)

## Verification

To verify the migration was successful, you can run:

```sql
-- Check that tasks table exists
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE '%task%';

-- Check constraints on tasks table
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass;

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks';
```

## Notes

- The migration script is **idempotent** - it can be run multiple times safely
- All data was preserved during the rename operation
- No data loss occurred
- Application tested and working after migration
