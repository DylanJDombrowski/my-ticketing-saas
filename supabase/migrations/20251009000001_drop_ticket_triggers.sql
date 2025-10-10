-- Migration: Drop old ticket-related triggers and functions
-- Date: 2025-10-09
-- Purpose: Remove orphaned triggers that reference deleted tickets table

-- Drop triggers on time_entries table
DROP TRIGGER IF EXISTS update_ticket_hours_on_time_entry_delete ON time_entries;
DROP TRIGGER IF EXISTS update_ticket_hours_on_time_entry_insert ON time_entries;
DROP TRIGGER IF EXISTS update_ticket_hours_on_time_entry_update ON time_entries;

-- Drop the function that was used by these triggers
DROP FUNCTION IF EXISTS update_ticket_actual_hours();

-- Add comment for documentation
COMMENT ON TABLE time_entries IS 'Time tracking entries for billable/non-billable work. No longer linked to tasks.';
