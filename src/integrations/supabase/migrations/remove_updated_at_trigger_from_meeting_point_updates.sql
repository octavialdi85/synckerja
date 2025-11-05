-- Remove trigger for updated_at column from meeting_point_updates
-- This table does not have an updated_at column, so the trigger causes errors

DROP TRIGGER IF EXISTS handle_meeting_point_updates_updated_at ON public.meeting_point_updates;

COMMENT ON TRIGGER handle_meeting_point_updates_updated_at ON public.meeting_point_updates IS NULL;

