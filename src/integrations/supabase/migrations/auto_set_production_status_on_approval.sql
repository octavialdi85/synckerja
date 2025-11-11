-- Migration: Auto-set production_status and production_completion_date
-- Description: Automatically sets production_status to "Need Review" and production_completion_date 
--              when approved = TRUE, google_drive_link IS NOT NULL, and production_approved = FALSE
--              BUT respects "Request Revision" status if it was explicitly set
-- Created: 2025-01-XX

-- Function to auto-set production status and completion date
CREATE OR REPLACE FUNCTION auto_set_production_status_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if conditions are met:
  -- 1. approved = TRUE
  -- 2. google_drive_link IS NOT NULL (and not empty)
  -- 3. production_approved = FALSE
  -- 4. production_status is NOT "Request Revision" (respect explicit "Request Revision" status)
  IF NEW.approved = TRUE 
     AND NEW.google_drive_link IS NOT NULL 
     AND TRIM(NEW.google_drive_link) != ''
     AND (NEW.production_approved = FALSE OR NEW.production_approved IS NULL)
     AND NEW.production_status != 'Request Revision' THEN
    
    -- Only update if production_status is not already "Need Review" or if production_completion_date is NULL
    -- This prevents unnecessary updates and overwriting existing completion dates
    IF NEW.production_status IS DISTINCT FROM 'Need Review' OR NEW.production_completion_date IS NULL THEN
      -- Set production_status to "Need Review"
      NEW.production_status := 'Need Review';
      
      -- Set production_completion_date to current timestamp if it's NULL
      IF NEW.production_completion_date IS NULL THEN
        NEW.production_completion_date := NOW();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function
DROP TRIGGER IF EXISTS trigger_auto_set_production_status_on_approval ON social_media_plans;

CREATE TRIGGER trigger_auto_set_production_status_on_approval
  BEFORE INSERT OR UPDATE OF approved, google_drive_link, production_approved, production_status, production_completion_date
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_production_status_on_approval();

-- Add comment for documentation
COMMENT ON FUNCTION auto_set_production_status_on_approval() IS 
'Automatically sets production_status to "Need Review" and production_completion_date when approved = TRUE, google_drive_link IS NOT NULL, and production_approved = FALSE';

