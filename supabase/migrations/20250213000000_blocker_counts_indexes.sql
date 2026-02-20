-- Migration: Indexes for get_unresolved_blocker_counts RPC (reduce timeout)
-- Purpose: Speed up blocker count queries so chunk requests complete within timeout
-- RPC joins: task_step_history ON task_step_id / task_steps_to_steps_id with action_type = 'blocker_added' AND is_resolved = false
-- Date: 2025-02-13

-- Partial index: step-level blockers (used in step_blockers CTE)
CREATE INDEX IF NOT EXISTS idx_task_step_history_blocker_by_step
ON public.task_step_history(task_step_id)
WHERE action_type = 'blocker_added' AND COALESCE(is_resolved, false) = false;

-- Partial index: sub-step-level blockers (used in sub_blockers CTE)
CREATE INDEX IF NOT EXISTS idx_task_step_history_blocker_by_substep
ON public.task_step_history(task_steps_to_steps_id)
WHERE action_type = 'blocker_added' AND COALESCE(is_resolved, false) = false;

COMMENT ON INDEX idx_task_step_history_blocker_by_step IS
'Supports get_unresolved_blocker_counts step_blockers CTE (task_step_id + blocker_added + unresolved).';

COMMENT ON INDEX idx_task_step_history_blocker_by_substep IS
'Supports get_unresolved_blocker_counts sub_blockers CTE (task_steps_to_steps_id + blocker_added + unresolved).';
