-- Migration: Remove triggers causing 500 error on get_unresolved_blocker_counts RPC
-- Purpose: Fix error 500 when calling get_unresolved_blocker_counts function
-- Date: 2025-01-10

BEGIN;

-- Drop trigger that updates task_step_history updated_at (BEFORE UPDATE)
-- This trigger might interfere with queries on task_step_history
DROP TRIGGER IF EXISTS update_task_step_history_updated_at ON public.task_step_history;

-- Drop trigger that sets task step completed_at (BEFORE INSERT/UPDATE)
-- This trigger performs queries which could cause issues
DROP TRIGGER IF EXISTS trigger_set_task_step_completed_at ON public.task_steps;

-- Drop trigger that updates task has_substeps (AFTER INSERT/DELETE)
-- This trigger performs UPDATE queries which could cause issues
DROP TRIGGER IF EXISTS trigger_update_task_has_substeps ON public.task_steps;

-- Drop trigger that updates task_steps updated_at (BEFORE UPDATE)
-- This trigger might interfere with queries
DROP TRIGGER IF EXISTS update_task_steps_updated_at ON public.task_steps;

-- Drop trigger that sets task substep completed_at (BEFORE INSERT/UPDATE)
-- This trigger performs queries which could cause issues
DROP TRIGGER IF EXISTS trigger_set_task_substep_completed_at ON public.task_steps_to_steps;

-- Drop trigger that updates has_substeps on parent step (AFTER INSERT/DELETE)
-- This trigger performs UPDATE queries which could cause issues
DROP TRIGGER IF EXISTS trigger_update_has_substeps ON public.task_steps_to_steps;

-- Drop trigger that updates step has_substeps (AFTER INSERT/DELETE)
-- This trigger performs UPDATE queries which could cause issues
DROP TRIGGER IF EXISTS trigger_update_step_has_substeps ON public.task_steps_to_steps;

-- Note: We're keeping the functions but removing the triggers
-- The functions can be re-enabled later if needed without recreating them

COMMIT;

