-- Migration: Validate sub-step due_date with optimized trigger
-- Description: Creates trigger to validate that sub-step due_date cannot be greater than parent step due_date
-- Created: 2025-01-XX
-- Risk Level: Medium (with mitigations: early exits, index usage, error handling)

BEGIN;

-- Function untuk validasi due_date sub-step dengan optimasi dan mitigasi resiko
CREATE OR REPLACE FUNCTION validate_substep_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_step_id UUID;
  step_due_date TIMESTAMPTZ;
  substep_due_date TIMESTAMPTZ;
  step_assignment_id UUID;
BEGIN
  -- MITIGASI 1: Early exit jika bukan sub-step assignment (optimasi performance)
  IF NEW.task_steps_to_steps_assigned_id IS NULL THEN
    RETURN NEW; -- Skip validation untuk step assignments
  END IF;

  -- MITIGASI 2: Gunakan index untuk query cepat
  -- Get parent step ID dari sub-step assignment (dengan index)
  SELECT tsts.parent_step_id INTO parent_step_id
  FROM task_steps_to_steps_assigned tstsa
  JOIN task_steps_to_steps tsts ON tsts.id = tstsa.task_steps_to_steps_id
  WHERE tstsa.id = NEW.task_steps_to_steps_assigned_id
  LIMIT 1; -- Limit untuk safety
  
  -- MITIGASI 3: Early exit jika tidak ada parent step (edge case handling)
  IF parent_step_id IS NULL THEN
    RETURN NEW; -- Skip validation jika tidak ada parent step
  END IF;

  -- MITIGASI 4: Get step assignment ID dulu (untuk query yang lebih efisien)
  SELECT id INTO step_assignment_id
  FROM task_steps_assigned
  WHERE task_step_id = parent_step_id
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  -- MITIGASI 5: Early exit jika step tidak punya assignment (edge case)
  IF step_assignment_id IS NULL THEN
    RETURN NEW; -- Skip validation jika step tidak punya assignment
  END IF;

  -- MITIGASI 6: Get step due_date dengan query yang dioptimasi (menggunakan index)
  SELECT tsad.due_date INTO step_due_date
  FROM task_steps_assigned_duedate tsad
  WHERE tsad.task_steps_assigned_id = step_assignment_id
  ORDER BY tsad.created_at DESC
  LIMIT 1;
  
  -- MITIGASI 7: Early exit jika step tidak punya due_date (tidak perlu validasi)
  IF step_due_date IS NULL THEN
    RETURN NEW; -- Skip validation jika step tidak punya due_date
  END IF;

  -- MITIGASI 8: Validasi dengan date comparison (set time to end of day)
  substep_due_date := NEW.due_date;
  
  -- Compare dates (not timestamps) untuk menghindari timezone issues
  IF substep_due_date::date > step_due_date::date THEN
    RAISE EXCEPTION 'Sub-step due date (%) cannot be greater than parent step due date (%). Please set a due date on or before %.', 
      substep_due_date::date, 
      step_due_date::date,
      step_due_date::date
      USING ERRCODE = '23514'; -- Check violation error code
  END IF;
  
  RETURN NEW;
EXCEPTION
  -- MITIGASI 9: Error handling yang lebih baik
  WHEN OTHERS THEN
    -- Log error untuk debugging (jika ada logging system)
    RAISE WARNING 'Error in validate_substep_due_date: %', SQLERRM;
    -- Re-raise exception dengan context yang lebih jelas
    RAISE;
END;
$$;

-- MITIGASI 10: Pastikan index ada sebelum trigger (untuk performance)
-- Index sudah dibuat di migration sebelumnya, tapi kita pastikan di sini
CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_assigned_id 
ON task_steps_to_steps_assigned(id);

CREATE INDEX IF NOT EXISTS idx_task_steps_to_steps_id 
ON task_steps_to_steps(id);

CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_task_step_id 
ON task_steps_assigned(task_step_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_duedate_assigned_id_created 
ON task_steps_assigned_duedate(task_steps_assigned_id, created_at DESC);

-- Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS trigger_validate_substep_due_date ON task_steps_assigned_duedate;

-- Create trigger dengan BEFORE INSERT/UPDATE untuk validasi
CREATE TRIGGER trigger_validate_substep_due_date
BEFORE INSERT OR UPDATE OF due_date, task_steps_to_steps_assigned_id
ON task_steps_assigned_duedate
FOR EACH ROW
EXECUTE FUNCTION validate_substep_due_date();

-- MITIGASI 11: Add comment untuk dokumentasi
COMMENT ON FUNCTION validate_substep_due_date() IS 
'Validates that sub-step due date cannot be greater than parent step due date. 
Optimized with early exits and index usage for performance. 
Handles edge cases: missing parent step, missing step assignment, missing step due_date.';

COMMIT;







