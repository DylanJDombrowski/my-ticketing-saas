-- Migration: Remove Tasks System, Simplify Time Entries
-- Date: 2025-10-08
-- Purpose: Simplify app for invoice-first workflow (Billable pivot)

-- Step 1: Add invoice_id to time_entries (for direct association)
ALTER TABLE time_entries
ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Step 2: Add client_id to time_entries (so we don't need tasks)
ALTER TABLE time_entries
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Step 3: Backfill client_id from existing task relationships
UPDATE time_entries
SET client_id = tasks.client_id
FROM tasks
WHERE time_entries.task_id = tasks.id;

-- Step 4: Make task_id nullable (no longer required)
ALTER TABLE time_entries
ALTER COLUMN task_id DROP NOT NULL;

-- Step 5: Add reminder tracking to invoices
ALTER TABLE invoices
ADD COLUMN last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_count INTEGER DEFAULT 0;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice ON time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON time_entries(client_id);

-- Step 7: Drop task-related tables (cascades to task_comments)
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Step 8: Add helpful column comments
COMMENT ON COLUMN time_entries.invoice_id IS 'Optional: Link time entry directly to invoice';
COMMENT ON COLUMN time_entries.client_id IS 'Required: Which client this time is for';
COMMENT ON COLUMN time_entries.task_id IS 'Deprecated: Task system removed, kept for backward compatibility';
COMMENT ON COLUMN invoices.last_reminder_sent_at IS 'When last payment reminder was sent';
COMMENT ON COLUMN invoices.reminder_count IS 'How many reminders have been sent for this invoice';
