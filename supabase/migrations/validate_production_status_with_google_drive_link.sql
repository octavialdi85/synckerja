-- Migration: Validate production_status requires google_drive_link for "Need Review"
-- Description: Prevents production_status from being "Need Review" when google_drive_link is NULL or EMPTY
-- Created: 2025-01-XX

-- Function to validate production_status constraint
CREATE OR REPLACE FUNCTION validate_production_status_with_google_drive_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if production_status is being set to "Need Review"
  IF NEW.production_status = 'Need Review' THEN
    -- Validate that google_drive_link is not NULL and not empty
    IF NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '' THEN
      RAISE EXCEPTION 'Cannot set production_status to "Need Review" when google_drive_link is NULL or EMPTY. Please provide a Google Drive link first.';
    END IF;
  END IF;
  
  -- Check if google_drive_link is being removed/cleared while production_status is "Need Review"
  IF NEW.production_status = 'Need Review' AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    -- If production_status is "Need Review" but google_drive_link is being set to NULL/EMPTY, reset status
    IF (TG_OP = 'UPDATE' AND OLD.production_status = 'Need Review') OR (TG_OP = 'INSERT' AND NEW.production_status = 'Need Review') THEN
      -- Auto-reset production_status to NULL when link is removed
      NEW.production_status := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS trigger_validate_production_status_with_google_drive_link ON social_media_plans;

CREATE TRIGGER trigger_validate_production_status_with_google_drive_link
  BEFORE INSERT OR UPDATE OF production_status, google_drive_link
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION validate_production_status_with_google_drive_link();

-- Add comment for documentation
COMMENT ON FUNCTION validate_production_status_with_google_drive_link() IS 
'Validates that production_status cannot be "Need Review" when google_drive_link is NULL or EMPTY. Auto-resets status to NULL when link is removed.';

