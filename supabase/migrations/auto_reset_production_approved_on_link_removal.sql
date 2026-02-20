-- Migration: Auto-reset production_approved when google_drive_link is removed
-- Description: Automatically sets production_approved to false and clears production_approved_date when google_drive_link is cleared/removed
-- This ensures that approval status is automatically revoked when the Google Drive link is removed

CREATE OR REPLACE FUNCTION auto_reset_production_approved_on_link_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- If google_drive_link is being cleared/removed (was not empty, now is empty/null)
  IF (OLD.google_drive_link IS NOT NULL AND TRIM(OLD.google_drive_link) != '') 
     AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    -- Automatically reset production_approved to false and clear the date
    NEW.production_approved := FALSE;
    NEW.production_approved_date := NULL;
  END IF;
  
  -- Also prevent setting production_approved to true if google_drive_link is empty
  IF NEW.production_approved = TRUE AND (NEW.google_drive_link IS NULL OR TRIM(NEW.google_drive_link) = '') THEN
    RAISE EXCEPTION 'Cannot set production_approved to true when google_drive_link is NULL or EMPTY. Please provide a Google Drive link first.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old validation trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_production_approved_with_google_drive_link ON social_media_plans;

-- Create new trigger that auto-resets approval when link is removed
DROP TRIGGER IF EXISTS trigger_auto_reset_production_approved_on_link_removal ON social_media_plans;
CREATE TRIGGER trigger_auto_reset_production_approved_on_link_removal
  BEFORE INSERT OR UPDATE OF production_approved, google_drive_link
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_reset_production_approved_on_link_removal();

-- Add comment for documentation
COMMENT ON FUNCTION auto_reset_production_approved_on_link_removal() IS 
'Automatically resets production_approved to false and clears production_approved_date when google_drive_link is removed. Also prevents setting production_approved to true when google_drive_link is empty.';

