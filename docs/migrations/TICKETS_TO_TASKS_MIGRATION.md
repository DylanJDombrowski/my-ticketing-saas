# Database Migration: Tickets to Tasks

## Overview
This document outlines the required database schema changes to rename "Tickets" to "Tasks" throughout the application. The codebase has been updated to use "Task" terminology, but the database still uses "ticket" table and column names.

## IMPORTANT NOTES

1. **DO NOT RUN THESE MIGRATIONS WITHOUT A FULL DATABASE BACKUP**
2. **Test in a development/staging environment first**
3. **These changes will require application downtime during migration**
4. **Foreign key constraints must be handled carefully**

## Required Database Changes

### 1. Rename `tickets` table to `tasks`

```sql
-- Step 1: Rename the main table
ALTER TABLE tickets RENAME TO tasks;
```

### 2. Rename `ticket_comments` table to `task_comments`

```sql
-- Step 2: Rename the comments table
ALTER TABLE ticket_comments RENAME TO task_comments;
```

### 3. Update Foreign Key Column in `task_comments`

```sql
-- Step 3: Rename the foreign key column
ALTER TABLE task_comments
RENAME COLUMN ticket_id TO task_id;
```

### 4. Update Foreign Key Column in `time_entries`

```sql
-- Step 4: Rename the foreign key column in time_entries
ALTER TABLE time_entries
RENAME COLUMN ticket_id TO task_id;
```

### 5. Rename Foreign Key Constraints

After renaming tables and columns, you'll need to rename the foreign key constraints. The exact names may vary, but they typically follow this pattern:

```sql
-- Find existing constraint names
SELECT con.conname as constraint_name,
       con.conrelid::regclass as table_name,
       att.attname as column_name,
       cl.relname as referenced_table
FROM pg_constraint con
JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
JOIN pg_class cl ON cl.oid = con.confrelid
WHERE con.contype = 'f'
AND (con.conrelid::regclass::text = 'tasks'
     OR con.conrelid::regclass::text = 'task_comments'
     OR con.conrelid::regclass::text = 'time_entries');

-- Example: Rename constraints (adjust names based on your actual constraint names)
-- For task_comments table
ALTER TABLE task_comments
RENAME CONSTRAINT ticket_comments_ticket_id_fkey TO task_comments_task_id_fkey;

ALTER TABLE task_comments
RENAME CONSTRAINT ticket_comments_created_by_fkey TO task_comments_created_by_fkey;

ALTER TABLE task_comments
RENAME CONSTRAINT ticket_comments_tenant_id_fkey TO task_comments_tenant_id_fkey;

-- For tasks table
ALTER TABLE tasks
RENAME CONSTRAINT tickets_assigned_to_fkey TO tasks_assigned_to_fkey;

ALTER TABLE tasks
RENAME CONSTRAINT tickets_client_id_fkey TO tasks_client_id_fkey;

ALTER TABLE tasks
RENAME CONSTRAINT tickets_created_by_fkey TO tasks_created_by_fkey;

ALTER TABLE tasks
RENAME CONSTRAINT tickets_tenant_id_fkey TO tasks_tenant_id_fkey;

-- For time_entries table
ALTER TABLE time_entries
RENAME CONSTRAINT time_entries_ticket_id_fkey TO time_entries_task_id_fkey;
```

### 6. Update Indexes

```sql
-- Find and rename indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('tasks', 'task_comments', 'time_entries');

-- Example: Rename indexes (adjust based on your actual index names)
ALTER INDEX tickets_pkey RENAME TO tasks_pkey;
ALTER INDEX tickets_tenant_id_idx RENAME TO tasks_tenant_id_idx;
ALTER INDEX tickets_client_id_idx RENAME TO tasks_client_id_idx;
ALTER INDEX tickets_status_idx RENAME TO tasks_status_idx;
ALTER INDEX tickets_assigned_to_idx RENAME TO tasks_assigned_to_idx;

ALTER INDEX ticket_comments_pkey RENAME TO task_comments_pkey;
ALTER INDEX ticket_comments_ticket_id_idx RENAME TO task_comments_task_id_idx;
ALTER INDEX ticket_comments_tenant_id_idx RENAME TO task_comments_tenant_id_idx;

-- Update time_entries indexes
ALTER INDEX time_entries_ticket_id_idx RENAME TO time_entries_task_id_idx;
```

### 7. Update Row Level Security (RLS) Policies

```sql
-- Find existing RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('tasks', 'task_comments');

-- Drop old policies and create new ones for tasks table
DROP POLICY IF EXISTS "Users can view tickets from their tenant" ON tasks;
CREATE POLICY "Users can view tasks from their tenant" ON tasks
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert tickets for their tenant" ON tasks;
CREATE POLICY "Users can insert tasks for their tenant" ON tasks
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update tickets from their tenant" ON tasks;
CREATE POLICY "Users can update tasks from their tenant" ON tasks
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete tickets from their tenant" ON tasks;
CREATE POLICY "Users can delete tasks from their tenant" ON tasks
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Update policies for task_comments table
DROP POLICY IF EXISTS "Users can view ticket comments from their tenant" ON task_comments;
CREATE POLICY "Users can view task comments from their tenant" ON task_comments
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert ticket comments for their tenant" ON task_comments;
CREATE POLICY "Users can insert task comments for their tenant" ON task_comments
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update ticket comments from their tenant" ON task_comments;
CREATE POLICY "Users can update task comments from their tenant" ON task_comments
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete ticket comments from their tenant" ON task_comments;
CREATE POLICY "Users can delete task comments from their tenant" ON task_comments
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

### 8. Update Views (if any)

```sql
-- List all views that reference tickets
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%tickets%';

-- Recreate views with updated table names
-- (Specific views depend on your database schema)
```

### 9. Update Functions and Triggers

```sql
-- Find functions that reference tickets
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%tickets%';

-- Update function definitions to reference 'tasks' instead of 'tickets'
-- (Specific functions depend on your database schema)
```

## Migration Script Order

Execute the migrations in this order:

1. **Backup the database completely**
2. Begin transaction
3. Rename tables (tickets → tasks, ticket_comments → task_comments)
4. Rename foreign key columns (ticket_id → task_id)
5. Rename constraints
6. Rename indexes
7. Update RLS policies
8. Update views, functions, and triggers
9. Test thoroughly
10. Commit transaction

## Example Complete Migration Script

```sql
-- ALWAYS BACKUP FIRST!
BEGIN;

-- 1. Rename tables
ALTER TABLE tickets RENAME TO tasks;
ALTER TABLE ticket_comments RENAME TO task_comments;

-- 2. Rename columns
ALTER TABLE task_comments RENAME COLUMN ticket_id TO task_id;
ALTER TABLE time_entries RENAME COLUMN ticket_id TO task_id;

-- 3. Rename constraints (adjust names as needed)
-- Check actual constraint names with the query provided in section 5

-- 4. Rename indexes (adjust names as needed)
-- Check actual index names with the query provided in section 6

-- 5. Update RLS policies
-- Use the policy updates from section 7

-- 6. Test queries
SELECT * FROM tasks LIMIT 1;
SELECT * FROM task_comments LIMIT 1;
SELECT * FROM time_entries WHERE task_id IS NOT NULL LIMIT 1;

-- If everything looks good:
COMMIT;
-- Otherwise:
-- ROLLBACK;
```

## Post-Migration Verification

After running the migration, verify:

1. All tables renamed correctly
2. All foreign keys working
3. RLS policies functioning
4. Application can read/write data
5. No broken references in the application logs
6. Time entries properly link to tasks
7. Task comments properly link to tasks

## Rollback Plan

If issues occur, you can rollback by:

1. Restoring from backup (recommended)
2. Reversing the changes (rename tasks → tickets, etc.)

```sql
-- Emergency rollback script
BEGIN;

ALTER TABLE tasks RENAME TO tickets;
ALTER TABLE task_comments RENAME TO ticket_comments;
ALTER TABLE task_comments RENAME COLUMN task_id TO ticket_id;
ALTER TABLE time_entries RENAME COLUMN task_id TO ticket_id;

-- Revert constraints, indexes, and policies...

COMMIT;
```

## Application Code Status

The application code has been updated with the following changes:

- ✅ File names renamed (ticket-modal.tsx → task-modal.tsx, etc.)
- ✅ Component names updated (TicketModal → TaskModal, etc.)
- ✅ Store renamed (tickets.ts → tasks.ts)
- ✅ Type definitions updated (Ticket → Task, TicketStatus → TaskStatus, etc.)
- ✅ Routes renamed (/dashboard/tickets → /dashboard/tasks)
- ✅ UI labels updated ("Tickets" → "Tasks")
- ⚠️ Database queries still use old table names (tickets, ticket_comments, ticket_id)

**IMPORTANT:** The application code intentionally keeps using the old database table names until this migration is completed.

## Additional Notes for Supabase Users

If using Supabase, you may also need to:

1. Update Supabase Edge Functions (if any reference tickets)
2. Update Supabase Storage policies (if any)
3. Regenerate TypeScript types: `npx supabase gen types typescript`
4. Update `database.types.ts` file with new table names

## Testing Checklist

Before deploying to production:

- [ ] Migration tested in development environment
- [ ] All CRUD operations work for tasks
- [ ] Task comments work correctly
- [ ] Time entries link to tasks properly
- [ ] Reports and analytics display task data
- [ ] No console errors in application
- [ ] No database errors in application logs
- [ ] Performance is acceptable
- [ ] Rollback plan tested
