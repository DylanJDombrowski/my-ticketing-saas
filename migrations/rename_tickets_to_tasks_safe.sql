-- Migration: Rename tickets table to tasks (SAFE VERSION)
-- This migration handles cases where some renames may have already been done
-- Run this in your Supabase SQL Editor

-- Step 1: Rename the table if it exists as 'tickets'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        ALTER TABLE public.tickets RENAME TO tasks;
        RAISE NOTICE 'Renamed tickets table to tasks';
    ELSE
        RAISE NOTICE 'Table tickets already renamed or does not exist';
    END IF;
END $$;

-- Step 2: Rename constraints (only if they exist with old names)
DO $$
BEGIN
    -- Rename primary key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_pkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks RENAME CONSTRAINT tickets_pkey TO tasks_pkey;
        RAISE NOTICE 'Renamed tickets_pkey to tasks_pkey';
    END IF;

    -- Rename tenant_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_tenant_id_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks RENAME CONSTRAINT tickets_tenant_id_fkey TO tasks_tenant_id_fkey;
        RAISE NOTICE 'Renamed tickets_tenant_id_fkey to tasks_tenant_id_fkey';
    END IF;

    -- Rename client_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_client_id_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks RENAME CONSTRAINT tickets_client_id_fkey TO tasks_client_id_fkey;
        RAISE NOTICE 'Renamed tickets_client_id_fkey to tasks_client_id_fkey';
    END IF;

    -- Rename assigned_to foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_assigned_to_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks RENAME CONSTRAINT tickets_assigned_to_fkey TO tasks_assigned_to_fkey;
        RAISE NOTICE 'Renamed tickets_assigned_to_fkey to tasks_assigned_to_fkey';
    END IF;

    -- Rename created_by foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_created_by_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks RENAME CONSTRAINT tickets_created_by_fkey TO tasks_created_by_fkey;
        RAISE NOTICE 'Renamed tickets_created_by_fkey to tasks_created_by_fkey';
    END IF;
END $$;

-- Step 3: Rename indexes (drop old, create new)
DROP INDEX IF EXISTS public.idx_tickets_tenant_id;
DROP INDEX IF EXISTS public.idx_tickets_client_id;
DROP INDEX IF EXISTS public.idx_tickets_status;
DROP INDEX IF EXISTS public.idx_tickets_assigned_to;
DROP INDEX IF EXISTS public.idx_tickets_created_at;

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON public.tasks USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks USING btree (created_at);

-- Step 4: Rename ticket_comments table to task_comments (if not already done)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ticket_comments'
    ) THEN
        ALTER TABLE public.ticket_comments RENAME TO task_comments;
        RAISE NOTICE 'Renamed ticket_comments table to task_comments';
    ELSE
        RAISE NOTICE 'Table ticket_comments already renamed or does not exist';
    END IF;
END $$;

-- Step 5: Update task_comments constraints
DO $$
BEGIN
    -- Rename primary key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ticket_comments_pkey' AND table_name = 'task_comments'
    ) THEN
        ALTER TABLE public.task_comments RENAME CONSTRAINT ticket_comments_pkey TO task_comments_pkey;
        RAISE NOTICE 'Renamed ticket_comments_pkey to task_comments_pkey';
    END IF;

    -- Handle task_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ticket_comments_ticket_id_fkey'
        AND table_name = 'task_comments'
    ) THEN
        ALTER TABLE public.task_comments DROP CONSTRAINT ticket_comments_ticket_id_fkey;
        ALTER TABLE public.task_comments
            ADD CONSTRAINT task_comments_task_id_fkey
            FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Updated task_id foreign key constraint';
    END IF;

    -- Rename tenant_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ticket_comments_tenant_id_fkey' AND table_name = 'task_comments'
    ) THEN
        ALTER TABLE public.task_comments RENAME CONSTRAINT ticket_comments_tenant_id_fkey TO task_comments_tenant_id_fkey;
        RAISE NOTICE 'Renamed ticket_comments_tenant_id_fkey';
    END IF;

    -- Rename created_by foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ticket_comments_created_by_fkey' AND table_name = 'task_comments'
    ) THEN
        ALTER TABLE public.task_comments RENAME CONSTRAINT ticket_comments_created_by_fkey TO task_comments_created_by_fkey;
        RAISE NOTICE 'Renamed ticket_comments_created_by_fkey';
    END IF;
END $$;

-- Step 6: Update RLS policies - Drop old policies with 'ticket' naming
DROP POLICY IF EXISTS "Users can create tickets" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tickets" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tickets" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tickets" ON public.tasks;
DROP POLICY IF EXISTS "tickets_delete" ON public.tasks;
DROP POLICY IF EXISTS "tickets_insert" ON public.tasks;
DROP POLICY IF EXISTS "tickets_select" ON public.tasks;
DROP POLICY IF EXISTS "tickets_update" ON public.tasks;

-- Step 7: Create new RLS policies with 'task' naming
DO $$
BEGIN
    -- Check if policies already exist before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_select'
    ) THEN
        CREATE POLICY "tasks_select" ON public.tasks
        FOR SELECT TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created tasks_select policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_insert'
    ) THEN
        CREATE POLICY "tasks_insert" ON public.tasks
        FOR INSERT TO authenticated
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created tasks_insert policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_update'
    ) THEN
        CREATE POLICY "tasks_update" ON public.tasks
        FOR UPDATE TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        )
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created tasks_update policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_delete'
    ) THEN
        CREATE POLICY "tasks_delete" ON public.tasks
        FOR DELETE TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created tasks_delete policy';
    END IF;
END $$;

-- Step 8: Update triggers
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON public.task_comments;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Update indexes on task_comments
DROP INDEX IF EXISTS public.idx_ticket_comments_tenant_id;
DROP INDEX IF EXISTS public.idx_ticket_comments_ticket_id;

CREATE INDEX IF NOT EXISTS idx_task_comments_tenant_id ON public.task_comments USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments USING btree (task_id);

-- Step 10: Update RLS policies on task_comments
DROP POLICY IF EXISTS "Users can manage ticket comments" ON public.task_comments;
DROP POLICY IF EXISTS "ticket_comments_delete" ON public.task_comments;
DROP POLICY IF EXISTS "ticket_comments_insert" ON public.task_comments;
DROP POLICY IF EXISTS "ticket_comments_select" ON public.task_comments;
DROP POLICY IF EXISTS "ticket_comments_update" ON public.task_comments;

-- Create task_comments policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'task_comments' AND policyname = 'task_comments_select'
    ) THEN
        CREATE POLICY "task_comments_select" ON public.task_comments
        FOR SELECT TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created task_comments_select policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'task_comments' AND policyname = 'task_comments_insert'
    ) THEN
        CREATE POLICY "task_comments_insert" ON public.task_comments
        FOR INSERT TO authenticated
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created task_comments_insert policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'task_comments' AND policyname = 'task_comments_update'
    ) THEN
        CREATE POLICY "task_comments_update" ON public.task_comments
        FOR UPDATE TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        )
        WITH CHECK (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created task_comments_update policy';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'task_comments' AND policyname = 'task_comments_delete'
    ) THEN
        CREATE POLICY "task_comments_delete" ON public.task_comments
        FOR DELETE TO authenticated
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.profiles
                WHERE id = auth.uid()
            )
        );
        RAISE NOTICE 'Created task_comments_delete policy';
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    tasks_exists boolean;
    task_comments_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) INTO tasks_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'task_comments'
    ) INTO task_comments_exists;

    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'Tasks table exists: %', tasks_exists;
    RAISE NOTICE 'Task comments table exists: %', task_comments_exists;

    IF tasks_exists AND task_comments_exists THEN
        RAISE NOTICE 'Migration successful! Both tables renamed.';
    ELSE
        RAISE WARNING 'Some tables may not exist. Please check manually.';
    END IF;
END $$;
