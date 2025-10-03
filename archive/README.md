# Archive Directory

This directory contains historical files and documentation that are no longer actively used in the project but are kept for reference.

## Old SQL Files

The `old-sql-files/` directory contains manual SQL migration files that were created during early development sprints:

- `initial_schema.sql` - Original database schema
- `database_security_fix.sql` - Sprint 1 security hardening
- `database_constraints_fix.sql` - Sprint 1 constraint enforcement
- `sprint_4_migration_manual.sql` - Sprint 4 business automation features
- `current_schema.sql` - Manual schema dump
- `dump.sql` - Manual database dump
- `schema.sql` - Latest manual schema export

**Note:** All database changes are now managed through the Supabase CLI migrations in `/supabase/migrations/`. These archived files are kept for historical reference only.

## Migration to Supabase CLI

As of October 2025, the project uses the Supabase CLI workflow:

1. Create migrations: `supabase migration new feature_name`
2. Apply changes: `supabase db push`
3. Pull remote changes: `supabase db pull`

All active migrations are in `/supabase/migrations/`.
