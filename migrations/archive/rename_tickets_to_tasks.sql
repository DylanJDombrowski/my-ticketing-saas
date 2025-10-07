-- Migration: Rename tickets table to tasks
-- This migration renames the tickets table to tasks and updates all related constraints, indexes, and policies
-- Run this in your Supabase SQL Editor

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.tickets RENAME TO tasks;

-- Step 2: Rename constraints
ALTER TABLE public.tasks RENAME CONSTRAINT tickets_pkey TO tasks_pkey;
ALTER TABLE public.tasks RENAME CONSTRAINT tickets_tenant_id_fkey TO tasks_tenant_id_fkey;
ALTER TABLE public.tasks RENAME CONSTRAINT tickets_client_id_fkey TO tasks_client_id_fkey;
ALTER TABLE public.tasks RENAME CONSTRAINT tickets_assigned_to_fkey TO tasks_assigned_to_fkey;
ALTER TABLE public.tasks RENAME CONSTRAINT tickets_created_by_fkey TO tasks_created_by_fkey;

-- Step 3: Rename indexes
DROP INDEX IF EXISTS idx_tickets_tenant_id;
DROP INDEX IF EXISTS idx_tickets_client_id;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_tickets_assigned_to;
DROP INDEX IF EXISTS idx_tickets_created_at;

CREATE INDEX idx_tasks_tenant_id ON public.tasks USING btree (tenant_id);
CREATE INDEX idx_tasks_client_id ON public.tasks USING btree (client_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);

-- Step 4: Update task_comments foreign key constraint (if it still references tickets)
-- First check if the constraint exists and rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ticket_comments_ticket_id_fkey'
        AND table_name = 'task_comments'
    ) THEN
        ALTER TABLE public.task_comments
        DROP CONSTRAINT ticket_comments_ticket_id_fkey;

        ALTER TABLE public.task_comments
        ADD CONSTRAINT task_comments_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Rename ticket_comments table to task_comments (if not already renamed)
ALTER TABLE IF EXISTS public.ticket_comments RENAME TO task_comments;

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
CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid()
    )
);

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

CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid()
    )
);

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

-- Step 9: Update any remaining indexes on task_comments
DROP INDEX IF EXISTS idx_ticket_comments_tenant_id;
DROP INDEX IF EXISTS idx_ticket_comments_ticket_id;

CREATE INDEX IF NOT EXISTS idx_task_comments_tenant_id ON public.task_comments USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments USING btree (task_id);

-- Verification queries (optional - comment out when running)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%task%';
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass;
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'tasks';
