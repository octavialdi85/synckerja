-- Migration: Remove triggers causing 500 error on task_files queries
-- Purpose: Fix error 500 when querying task_files with task_steps_id filter
-- Date: 2025-01-10

BEGIN;

-- Drop trigger that enforces plan completion on task_steps (BEFORE INSERT/UPDATE)
-- This trigger performs SELECT queries on social_media_plans which could cause issues
DROP TRIGGER IF EXISTS trigger_ab_enforce_plan_completion_on_task_steps ON public.task_steps;

-- Drop trigger that enforces plan completion on task_substeps (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS trigger_ab_enforce_plan_completion_on_task_substeps ON public.task_steps_to_steps;

-- Drop trigger that syncs task steps completion with social media plan (AFTER UPDATE)
-- This trigger performs UPDATE queries on task_steps and task_steps_to_steps which could cause issues
DROP TRIGGER IF EXISTS trigger_sync_task_steps_completion_with_plan ON public.social_media_plans;

-- Drop trigger that updates task step history denormalized (BEFORE INSERT/UPDATE)
-- This trigger performs complex SELECT queries which could cause issues
DROP TRIGGER IF EXISTS trigger_update_task_step_history_denormalized ON public.task_step_history;

-- Note: We're keeping the functions but removing the triggers
-- The functions can be re-enabled later if needed without recreating them

COMMIT;

