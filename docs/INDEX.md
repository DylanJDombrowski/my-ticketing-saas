# Documentation Index

This directory contains all documentation for the Billable project, organized by category.

## 📁 Structure

### `/setup` - Configuration & Setup Guides
Documentation for setting up external services and features:
- **[Invoice & Email Setup](./setup/INVOICE_EMAIL_SETUP.md)** - Configure Resend for invoice emails
- **[Stripe Setup](./setup/STRIPE_SETUP.md)** - Complete Stripe Connect & payment configuration
- **[Payment Workflow](./setup/PAYMENT_WORKFLOW.md)** - How payments flow through the system

### `/migrations` - Database Migrations
SQL migration scripts and guides:
- **[Tickets to Tasks Migration](./migrations/TICKETS_TO_TASKS_MIGRATION.md)** - Rename tickets to tasks in database
- **[Constraint Rename Script](../RENAME_CONSTRAINTS.sql)** - SQL to rename foreign key constraints
- **[Apply Payment Migration](./migrations/APPLY_PAYMENT_MIGRATION.md)** - Payment-related database changes

### `/archive` - Historical Documentation
Outdated or completed documentation kept for reference:
- Launch checklists and session summaries
- Refactoring summaries
- Working session notes

## 🔝 Root Documentation

### Primary Docs (kept in root):
- **[README.md](../README.md)** - Project overview and getting started
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant instructions and architecture overview
- **[PROGRESS.md](../PROGRESS.md)** - Current sprint status and session tracking
- **[VISION.md](../VISION.md)** - Product vision and roadmap

## 📚 Quick Links by Topic

### Setting Up Your Environment
1. Clone the repo
2. See [README.md](../README.md) for initial setup
3. Configure [Invoice/Email](./setup/INVOICE_EMAIL_SETUP.md)
4. Set up [Stripe payments](./setup/STRIPE_SETUP.md)

### Database Changes
- Need to rename tickets to tasks? → [Tickets to Tasks Migration](./migrations/TICKETS_TO_TASKS_MIGRATION.md)
- Need to understand constraints? → Run verification queries in migration docs

### Feature Documentation
- How invoice emails work → [Invoice & Email Setup](./setup/INVOICE_EMAIL_SETUP.md)
- How client portal works → See CLAUDE.md architecture section
- How payments work → [Payment Workflow](./setup/PAYMENT_WORKFLOW.md)

## 🗑️ Recently Archived

The following files have been moved to `/archive` as they're no longer actively needed:
- Multiple launch checklists (consolidated into one strategy)
- Session summaries (historical record)
- Refactoring summaries (migration completed in code, DB pending)
