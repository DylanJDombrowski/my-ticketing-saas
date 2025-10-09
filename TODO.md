## Sprint 1: Simplification & Repositioning (Week 1)

### Phase 1: Database Cleanup

- [ ] Drop `tasks` table (formerly tickets)
- [ ] Drop `task_comments` table
- [ ] Make `time_entries.task_id` nullable (time entries no longer require a task)
- [ ] Add `time_entries.invoice_id` for direct invoice association
- [ ] Migration: `20251008_remove_tasks_simplify_time_entries.sql`

### Phase 2: Code Deletion

- [ ] Delete `/src/app/dashboard/tasks/` directory entirely
- [ ] Delete `/src/app/dashboard/tasks/[id]/` directory
- [ ] Delete `/src/stores/tasks.ts`
- [ ] Delete `/src/components/modals/task-modal.tsx`
- [ ] Delete `/src/components/task-comments.tsx`
- [ ] Delete `/src/components/sla-monitor.tsx` (already removed from features)
- [ ] Remove all task/ticket imports from:
  - `/src/stores/time-entries.ts`
  - `/src/stores/invoices.ts`
  - `/src/app/dashboard/page.tsx`
  - `/src/app/dashboard/reports/page.tsx`

### Phase 3: Simplify Time Entries

- [ ] Update `/src/app/dashboard/time-entries/page.tsx`:

  - Remove "Task" column from table
  - Add "Invoice" column (show which invoice this is on, if any)
  - Make creating time entries NOT require a task
  - Simple form: Date, Hours, Description, Billable checkbox, Client dropdown
  - Optional: Attach to existing invoice

- [ ] Update `/src/components/modals/time-entry-modal.tsx`:

  - Remove task_id requirement
  - Add client_id dropdown (required)
  - Add optional invoice_id (if they want to add to existing invoice)
  - Form fields: Client, Date, Hours, Description, Billable

- [ ] Update `/src/stores/time-entries.ts`:
  - Remove task_id requirement from CreateTimeEntryForm
  - Update queries to not require task joins

### Phase 4: Simplify Navigation

- [ ] Update `/src/app/dashboard/layout.tsx`:

  - Remove "Tasks" nav item
  - New order: Dashboard, Clients, Time Entries, Invoices, Settings
  - Remove Alt+T keyboard shortcut
  - Keep Alt+E for Time Entries

- [ ] Update `/src/components/keyboard-shortcuts-modal.tsx`:
  - Remove task-related shortcuts

### Phase 5: Dashboard Simplification

- [ ] Update `/src/app/dashboard/page.tsx`:
  - Remove ALL task/ticket metrics
  - New cards (4 max):
    1. "Revenue This Month" (paid invoices)
    2. "Pending Invoices" (sent but unpaid)
    3. "Hours This Month" (billable only)
    4. "Recent Payments" (last 5 paid invoices)
  - Remove "Recent Tickets" section entirely
  - Add "Recent Invoices" section instead

### Phase 6: Invoice Enhancements

- [ ] Add "Send Reminder" button to invoice actions:

  - New API route: `/api/invoices/send-reminder`
  - Button only shows for "sent" or "overdue" invoices
  - Sends friendly reminder email via Resend
  - Tracks last_reminder_sent_at in invoices table

- [ ] Update invoice status badges:

  - Make "overdue" more prominent (red with alert icon)
  - Add days overdue counter

- [ ] Invoice creation flow:
  - Step 1: Select client
  - Step 2: Add time entries OR skip and manually add line items
  - Step 3: Review & send

### Phase 7: Copy & Messaging Updates

- [ ] Update homepage (`/src/app/page.tsx`):

  - New hero: "Invoice clients in 60 seconds. Get paid via Stripe."
  - Subhead: "The stupid-simple invoicing tool for freelancers who just want to get paid."
  - Remove all "time tracking" hero messaging
  - Time tracking is mentioned as "optional feature" lower on page

- [ ] Update `/src/app/dashboard/layout.tsx`:

  - Change page title from "Ticketing SaaS" to "Billable"

- [ ] Update `README.md`:

  - New tagline: "The fastest way to invoice freelance clients and collect payment"
  - Update feature list (invoicing first, time tracking optional)
  - Remove task/ticket terminology

- [ ] Update `VISION.md`:
  - New mission: "Help freelancers get paid faster"
  - Rewrite positioning (invoice-first, not time-tracking-first)
  - Phase 2 becomes: Contracts/SOWs → Invoice → Payment lifecycle

### Phase 8: Type System Updates

- [ ] Update `/src/lib/types.ts`:

  - Remove Task, CreateTaskForm types
  - Remove TaskComment types
  - Update TimeEntry to not require task_id
  - Add client_id to TimeEntry
  - Keep legacy Ticket types for now (backwards compat) but mark deprecated

- [ ] Update database types:
  - Regenerate `/src/lib/database.types.ts` after migration

### Phase 9: Clean Up Dead Code

- [ ] Search codebase for "ticket" or "task" references:

  - Fix any remaining imports
  - Update comments
  - Remove unused variables

- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Build check: `npm run build`

-- Migration: Remove Tasks System, Simplify Time Entries
-- Date: 2025-10-08
-- Purpose: Simplify app for invoice-first workflow

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
ADD COLUMN last_reminder_sent_at TIMESTAMP,
ADD COLUMN reminder_count INTEGER DEFAULT 0;

-- Step 6: Create index for invoice lookups
CREATE INDEX idx_time_entries_invoice ON time_entries(invoice_id);
CREATE INDEX idx_time_entries_client ON time_entries(client_id);

-- Step 7: Drop task-related tables (cascades to task_comments)
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Step 8: Clean up orphaned time entries (optional, for safety)
-- DELETE FROM time_entries WHERE client_id IS NULL;

COMMENT ON COLUMN time_entries.invoice_id IS 'Optional: Link time entry directly to invoice';
COMMENT ON COLUMN time_entries.client_id IS 'Required: Which client this time is for';
COMMENT ON COLUMN time_entries.task_id IS 'Deprecated: Task system removed';
COMMENT ON COLUMN invoices.last_reminder_sent_at IS 'When last payment reminder was sent';
COMMENT ON COLUMN invoices.reminder_count IS 'How many reminders have been sent';

// /src/app/page.tsx - Hero section

<section className="hero">
  <h1>Invoice clients in 60 seconds.<br/>Get paid via Stripe.</h1>
  
  <p className="subhead">
    The stupid-simple invoicing tool for freelancers who just want to get paid.
    No projects. No timesheets. No bullshit.
  </p>

  <div className="cta-buttons">
    <Button size="lg">Start Free Trial</Button>
    <Button size="lg" variant="outline">Watch Demo (60s)</Button>
  </div>

  <div className="social-proof">
    <p>✓ Connect your Stripe account</p>
    <p>✓ Send invoice with payment link</p>
    <p>✓ Get paid directly to your bank</p>
  </div>
</section>

// Three-benefit section

<section className="benefits">
  <div className="benefit">
    <Icon name="zap" />
    <h3>Stupidly Fast</h3>
    <p>Create an invoice in 60 seconds. Your clients pay with one click.</p>
  </div>

  <div className="benefit">
    <Icon name="stripe" />
    <h3>Stripe-Native</h3>
    <p>Payments go straight to your Stripe account. No middleman.</p>
  </div>

  <div className="benefit">
    <Icon name="bell" />
    <h3>Auto Reminders</h3>
    <p>One-click payment reminders when invoices go unpaid. No awkward emails.</p>
  </div>
</section>

// Optional time tracking mention (buried)

<section className="optional-features">
  <h3>Track time if you want to</h3>
  <p>
    Log hours and add them to invoices. Or skip it and just invoice for 
    projects. Your call.
  </p>
</section>

⚡ Quick Wins for Sprint 1
These will have the biggest impact for least effort:

1. "Bug Client" Reminder Button (HIGH IMPACT)
   tsx// In invoice actions dropdown
   {invoice.status === 'sent' || invoice.status === 'overdue' ? (
   <DropdownMenuItem onClick={() => sendReminder(invoice.id)}>
   <Bell className="h-4 w-4 mr-2" />
   Send Payment Reminder
   </DropdownMenuItem>
   ) : null}
   Email template:
   Subject: Friendly reminder: Invoice #INV-2025-0042

Hi [Client Name],

Just a quick reminder that invoice #INV-2025-0042 for $1,250
is still pending.

[Pay This Invoice Button]

If you've already sent payment, please disregard this message!

Thanks,
[Your Name] 2. Dashboard "At a Glance" (HIGH IMPACT)
tsx// Replace complex dashboard with 4 simple cards
<SimpleMetric 
  label="Revenue This Month"
  value="$8,450"
  change="+12% vs last month"
  icon={DollarSign}
/>

<SimpleMetric 
  label="Unpaid Invoices"
  value="$3,200"
  subtext="3 invoices pending"
  icon={Clock}
  variant="warning"
/>

<SimpleMetric 
  label="Billable Hours"
  value="42.5h"
  subtext="This month"
  icon={Timer}
/>

<SimpleMetric 
  label="Avg Payment Time"
  value="8 days"
  subtext="Down from 12 days"
  icon={TrendingDown}
  variant="success"
/> 3. Invoice Creation: 3 Clicks (MEDIUM IMPACT)
Step 1: Select client [dropdown]
Step 2: Add items

- "Add from time entries" [shows unbilled time for that client]
- OR "Add manual line item" [description, hours, rate]
  Step 3: Review & Send [shows preview, send button]

📋 Sprint 1 Checklist (Ready for Claude Code)
Copy this into your Claude Code session:
markdown# Sprint 1: Simplify & Pivot to Invoice-First

## Database

- [ ] Create migration: `20251008_remove_tasks_simplify.sql`
- [ ] Add `time_entries.client_id` column
- [ ] Add `time_entries.invoice_id` column
- [ ] Make `time_entries.task_id` nullable
- [ ] Add `invoices.last_reminder_sent_at` column
- [ ] Add `invoices.reminder_count` column
- [ ] Drop `tasks` and `task_comments` tables
- [ ] Run migration on local DB
- [ ] Regenerate database types

## Code Deletion

- [ ] Delete `/src/app/dashboard/tasks` folder
- [ ] Delete `/src/stores/tasks.ts`
- [ ] Delete `/src/components/modals/task-modal.tsx`
- [ ] Delete `/src/components/task-comments.tsx`
- [ ] Remove task imports from all files

## Updates

- [ ] Update `/src/stores/time-entries.ts` (remove task_id requirement)
- [ ] Update `/src/components/modals/time-entry-modal.tsx` (add client dropdown)
- [ ] Update `/src/app/dashboard/time-entries/page.tsx` (remove task column)
- [ ] Update `/src/app/dashboard/page.tsx` (new simple dashboard)
- [ ] Update `/src/app/dashboard/layout.tsx` (remove Tasks nav)
- [ ] Update `/src/lib/types.ts` (remove Task types)

## New Features

- [ ] Add "Send Reminder" button to invoices
- [ ] Create `/api/invoices/send-reminder` route
- [ ] Add reminder email template

## Copy Updates

- [ ] Update homepage hero
- [ ] Update README.md
- [ ] Update VISION.md
- [ ] Remove "ticketing" language everywhere

## Testing

- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Run `npm run build`
- [ ] Manual test: Create client → Add time → Create invoice → Send
