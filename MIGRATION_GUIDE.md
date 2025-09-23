# Database Migration Guide

This guide explains how to migrate your Supabase database to the improved schema developed during the sprints.

## Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g @supabase/cli
   ```

2. **Get your project details**:
   - Project Reference ID (from Supabase dashboard URL)
   - Database password (from Supabase project settings)

## Migration Steps

### Step 1: Initialize Supabase CLI

```bash
# Initialize Supabase in your project
supabase init

# Login to your Supabase account
supabase login

# Link to your existing project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Pull Current Database Schema

```bash
# Pull your current database schema
supabase db pull

# This creates migration files in supabase/migrations/
# Review what was pulled to understand current state
```

### Step 3: Review the Migration Files

Two migration files have been created:

1. **`supabase/migrations/20250923000001_initial_schema.sql`**:
   - Creates all tables and basic structure
   - Sets up Row Level Security (RLS) policies
   - Adds foreign key constraints
   - Creates triggers for automatic timestamps
   - Sets up user management functions

2. **`supabase/migrations/20250923000002_schema_improvements.sql`**:
   - Adds performance indexes for faster queries
   - Sets up proper permissions and grants

### Step 4: Test Migration Locally (Recommended)

```bash
# Start local Supabase (optional but recommended)
supabase start

# Apply migration locally first
supabase db push

# Test your application against local database
npm run dev

# If everything works, proceed to production
```

### Step 5: Apply to Production

```bash
# Apply migration to production database
supabase db push --linked

# Or apply specific migration
supabase migration up
```

## Alternative Approaches

### Option A: Manual SQL Execution

If you prefer not to use Supabase CLI:

1. Copy the contents of `supabase/migrations/20250923000001_schema_improvements.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and execute the migration SQL
4. Test your application

### Option B: Gradual Migration

Apply changes in smaller chunks:

1. **Indexes first** (safe, improves performance):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);
   -- ... other indexes
   ```

2. **RLS policies** (test thoroughly):
   ```sql
   -- Apply new RLS policies one table at a time
   ```

3. **Functions and triggers** (last):
   ```sql
   -- Apply functions and triggers
   ```

## Verification Steps

After migration, verify:

1. **Application functionality**:
   ```bash
   npm run dev
   # Test all major features
   ```

2. **Database queries**:
   ```sql
   -- Check if indexes exist
   SELECT indexname FROM pg_indexes WHERE tablename = 'tickets';

   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'clients';
   ```

3. **Performance**:
   - Dashboard should load faster
   - Large datasets should query efficiently

## Rollback Plan

If issues occur:

1. **Via Supabase CLI**:
   ```bash
   supabase migration down
   ```

2. **Manual rollback**:
   - Drop new indexes
   - Restore old RLS policies
   - Remove new functions

## Ongoing Schema Management

### Best Practices:

1. **Always use migrations** for schema changes:
   ```bash
   # Create new migration
   supabase migration new add_new_feature
   ```

2. **Version control** all migration files

3. **Test locally** before production:
   ```bash
   supabase db reset  # Reset local DB
   supabase db push   # Apply all migrations
   ```

4. **Backup before major changes**:
   ```bash
   # Backup production DB
   supabase db dump --data-only > backup.sql
   ```

## Migration File Structure

```
supabase/
├── config.toml              # Supabase project config
├── migrations/
│   ├── 20250923000001_schema_improvements.sql
│   └── (future migrations)
├── functions/               # Edge functions
└── seed.sql                # Sample data
```

## Troubleshooting

### Common Issues:

1. **Permission errors**:
   - Ensure you're project owner/admin
   - Check database permissions

2. **Migration conflicts**:
   - Review existing schema vs migration
   - Manually resolve conflicts

3. **RLS policy issues**:
   - Test policies with different user roles
   - Check auth.uid() context

### Support:

- Supabase CLI docs: https://supabase.com/docs/reference/cli
- Migration docs: https://supabase.com/docs/guides/cli/local-development#database-migrations
- Community: https://github.com/supabase/supabase/discussions

## Next Steps After Migration

1. **Update PROGRESS.md** to mark database migration complete
2. **Test all Sprint 3 features** with production data
3. **Monitor performance** improvements
4. **Plan Sprint 4** with the new solid foundation

---

**Remember**: Always backup your production database before running migrations!