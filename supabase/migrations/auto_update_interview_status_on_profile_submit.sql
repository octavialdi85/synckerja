-- Migration: Auto-update interview_status to 'completed' when candidate submits profile
-- Description: Automatically sets interview_status to 'completed' in job_applications 
--              when candidate_profiles.submitted_at is set (not null)
-- Created: 2025-01-XX

-- Function to auto-update interview_status to 'completed' when profile is submitted
CREATE OR REPLACE FUNCTION auto_update_interview_status_on_profile_submit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if submitted_at is being set (changed from NULL to a timestamp)
  -- This means the candidate has submitted their profile
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at) THEN
    -- Update interview_status to 'completed' for all job_applications linked to this candidate profile
    UPDATE job_applications
    SET 
      interview_status = 'completed',
      updated_at = NOW()
    WHERE candidate_profile_id = NEW.id
      AND interview_status IS DISTINCT FROM 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function
DROP TRIGGER IF EXISTS trigger_auto_update_interview_status_on_profile_submit ON candidate_profiles;

CREATE TRIGGER trigger_auto_update_interview_status_on_profile_submit
  AFTER UPDATE OF submitted_at ON candidate_profiles
  FOR EACH ROW
  WHEN (
    NEW.submitted_at IS NOT NULL 
    AND (OLD.submitted_at IS NULL OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at)
  )
  EXECUTE FUNCTION auto_update_interview_status_on_profile_submit();

-- Also handle INSERT case (if profile is created with submitted_at already set)
CREATE OR REPLACE FUNCTION auto_update_interview_status_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile is inserted with submitted_at already set
  IF NEW.submitted_at IS NOT NULL THEN
    -- Update interview_status to 'completed' for all job_applications linked to this candidate profile
    UPDATE job_applications
    SET 
      interview_status = 'completed',
      updated_at = NOW()
    WHERE candidate_profile_id = NEW.id
      AND interview_status IS DISTINCT FROM 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_interview_status_on_profile_insert ON candidate_profiles;

CREATE TRIGGER trigger_auto_update_interview_status_on_profile_insert
  AFTER INSERT ON candidate_profiles
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION auto_update_interview_status_on_profile_insert();
