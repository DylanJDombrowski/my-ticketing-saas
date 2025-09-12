ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
