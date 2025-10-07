# Run Constraint Rename Migration

Quick guide to rename foreign key constraints from "ticket" to "task".

## Prerequisites

✅ Code already updated (Tickets → Tasks refactoring complete)
✅ Database tables already renamed (if not, run [TICKETS_TO_TASKS_MIGRATION.md](./TICKETS_TO_TASKS_MIGRATION.md) first)
⚠️ This only renames the constraint names, not tables/columns

## Quick Run

### Option 1: Using Supabase Dashboard

1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Copy/paste from [../../RENAME_CONSTRAINTS.sql](../../RENAME_CONSTRAINTS.sql)
4. Click "Run"

### Option 2: Using psql

```bash
psql $DATABASE_URL -f RENAME_CONSTRAINTS.sql
```

### Option 3: Copy-paste SQL

```sql
-- Tasks table constraints
ALTER TABLE tasks
  RENAME CONSTRAINT tickets_tenant_id_fkey TO tasks_tenant_id_fkey;

ALTER TABLE tasks
  RENAME CONSTRAINT tickets_client_id_fkey TO tasks_client_id_fkey;

ALTER TABLE tasks
  RENAME CONSTRAINT tickets_assigned_to_fkey TO tasks_assigned_to_fkey;

ALTER TABLE tasks
  RENAME CONSTRAINT tickets_created_by_fkey TO tasks_created_by_fkey;

-- Task comments table constraints
ALTER TABLE task_comments
  RENAME CONSTRAINT ticket_comments_tenant_id_fkey TO task_comments_tenant_id_fkey;

ALTER TABLE task_comments
  RENAME CONSTRAINT ticket_comments_ticket_id_fkey TO task_comments_task_id_fkey;

ALTER TABLE task_comments
  RENAME CONSTRAINT ticket_comments_created_by_fkey TO task_comments_created_by_fkey;

-- Time entries table constraints
ALTER TABLE time_entries
  RENAME CONSTRAINT time_entries_ticket_id_fkey TO time_entries_task_id_fkey;
```

## Verify

After running, verify all constraints renamed:

```sql
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
     OR con.conrelid::regclass::text = 'time_entries')
ORDER BY table_name, constraint_name;
```

Expected output:
- All constraint names should start with `tasks_` or `task_comments_` or `time_entries_task_id_fkey`
- No constraint names should contain "ticket" anymore

## Safety

✅ Safe to run - only renames constraint names
✅ No data affected
✅ No foreign key relationships changed
✅ Rollback: Run ALTER TABLE ... RENAME CONSTRAINT with old names

## When to Run

Run this AFTER:
- Tables renamed (tickets → tasks)
- Columns renamed (ticket_id → task_id)

This is the final cleanup step for the Tickets→Tasks migration.
