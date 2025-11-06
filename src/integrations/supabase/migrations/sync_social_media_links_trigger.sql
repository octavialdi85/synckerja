-- Function to sync Google Drive link to task_step_links when production_approved = true
-- This function is called by a trigger on social_media_plans table
CREATE OR REPLACE FUNCTION sync_social_media_link_to_task_step()
RETURNS TRIGGER AS $$
DECLARE
  step_record RECORD;
  existing_link_id UUID;
BEGIN
  -- Early exit: Only process if production_approved or google_drive_link actually changed
  IF (TG_OP = 'UPDATE' AND 
      OLD.production_approved = NEW.production_approved AND 
      OLD.google_drive_link = NEW.google_drive_link) THEN
    RETURN NEW;
  END IF;

  -- Find all task_steps linked to this social_media_plan
  FOR step_record IN 
    SELECT id FROM task_steps 
    WHERE social_media_plan_id = NEW.id
  LOOP
    -- Check if auto-synced link already exists for this step from this plan
    SELECT id INTO existing_link_id
    FROM task_step_links
    WHERE task_step_id = step_record.id
      AND is_auto_synced = true
      AND source_social_media_plan_id = NEW.id
    LIMIT 1;

    -- If production_approved = true and google_drive_link exists
    IF NEW.production_approved = true AND NEW.google_drive_link IS NOT NULL AND NEW.google_drive_link != '' THEN
      IF existing_link_id IS NULL THEN
        -- Insert new auto-synced link
        INSERT INTO task_step_links (
          task_step_id, 
          title, 
          url, 
          description, 
          is_auto_synced, 
          source_social_media_plan_id
        )
        VALUES (
          step_record.id,
          'Google Drive Link',
          NEW.google_drive_link,
          'Auto-synced from Social Media Plan',
          true,
          NEW.id
        );
      ELSE
        -- Update existing auto-synced link
        UPDATE task_step_links
        SET url = NEW.google_drive_link,
            updated_at = NOW()
        WHERE id = existing_link_id;
      END IF;
    ELSIF NEW.production_approved = false OR NEW.google_drive_link IS NULL OR NEW.google_drive_link = '' THEN
      -- Delete only auto-synced links (not manual ones) when production_approved = false or link is empty
      IF existing_link_id IS NOT NULL THEN
        DELETE FROM task_step_links WHERE id = existing_link_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on social_media_plans table
DROP TRIGGER IF EXISTS trigger_sync_social_media_link_to_task_step ON social_media_plans;
CREATE TRIGGER trigger_sync_social_media_link_to_task_step
  AFTER INSERT OR UPDATE OF production_approved, google_drive_link
  ON social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION sync_social_media_link_to_task_step();

-- Add comment for documentation
COMMENT ON FUNCTION sync_social_media_link_to_task_step() IS 'Automatically syncs Google Drive links from social_media_plans to task_step_links when production_approved is true';

