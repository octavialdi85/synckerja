-- Migration: Validate production_approved requires google_drive_link
-- Description: Prevents production_approved from being set to true if google_drive_link is NULL or EMPTY
-- Created: 2025-01-XX

-- Function to validate production_approved constraint
CREATE OR REPLACE FUNCTION validate_production_approved_with_google_drive_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Case 1: Check if production_approved is being set to true
  IF NEW.production_approved = true THEN
    -- Validate that google_drive_link is not NULL and not empty
    IF NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '' THEN
      RAISE EXCEPTION 'Cannot set production_approved to true when google_drive_link is NULL or EMPTY. Please provide a Google Drive link first.';
    END IF;
  END IF;
  
  -- Case 2: Check if google_drive_link is being removed/cleared while production_approved is still true
  IF NEW.production_approved = true AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    -- If production_approved is true but google_drive_link is being set to NULL/EMPTY, prevent it
    IF (TG_OP = 'UPDATE' AND OLD.production_approved = true) OR (TG_OP = 'INSERT' AND NEW.production_approved = true) THEN
      RAISE EXCEPTION 'Cannot remove or clear google_drive_link when production_approved is true. Please set production_approved to false first, or provide a valid Google Drive link.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS trigger_validate_production_approved_with_google_drive_link ON social_media_plans;

CREATE TRIGGER trigger_validate_production_approved_with_google_drive_link
  BEFORE INSERT OR UPDATE OF production_approved, google_drive_link
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION validate_production_approved_with_google_drive_link();

-- Add comment for documentation
COMMENT ON FUNCTION validate_production_approved_with_google_drive_link() IS 
'Validates that production_approved cannot be set to true when google_drive_link is NULL or EMPTY. This ensures data integrity at the database level.';

