-- ================================================
-- RENAME FOREIGN KEY CONSTRAINTS
-- Rename all "ticket" references to "task"
-- ================================================

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

-- Time entries table constraints (only the ticket reference)
ALTER TABLE time_entries
  RENAME CONSTRAINT time_entries_ticket_id_fkey TO time_entries_task_id_fkey;

-- ================================================
-- VERIFICATION QUERY
-- Run this to verify all constraints were renamed
-- ================================================
/*
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
*/
