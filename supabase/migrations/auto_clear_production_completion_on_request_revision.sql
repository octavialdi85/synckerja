-- Migration: Auto-clear production_completion_date on Request Revision
-- Description: Automatically clears production_completion_date when production_status is set to "Request Revision"
-- Created: 2025-01-XX

-- Function to auto-clear production_completion_date when status is "Request Revision"
CREATE OR REPLACE FUNCTION auto_clear_production_completion_on_request_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- If production_status is being set to "Request Revision", clear production_completion_date
  IF NEW.production_status = 'Request Revision' THEN
    -- Always clear production_completion_date when status is "Request Revision"
    NEW.production_completion_date := NULL;
    
    -- Also reset production_approved and clear production_approved_date
    NEW.production_approved := FALSE;
    NEW.production_approved_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function
DROP TRIGGER IF EXISTS trigger_auto_clear_production_completion_on_request_revision ON social_media_plans;

CREATE TRIGGER trigger_auto_clear_production_completion_on_request_revision
  BEFORE INSERT OR UPDATE OF production_status, production_completion_date
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_clear_production_completion_on_request_revision();

-- Add comment for documentation
COMMENT ON FUNCTION auto_clear_production_completion_on_request_revision() IS 
'Automatically clears production_completion_date, production_approved, and production_approved_date when production_status is set to "Request Revision". This ensures data consistency at the database level.';

