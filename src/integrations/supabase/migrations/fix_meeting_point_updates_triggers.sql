-- Fix trigger functions for meeting_point_updates after schema change
-- These functions now need to get meeting_point_id from meeting_point_solutions table

-- Fix function: update_meeting_point_latest_update
-- This function updates the meeting_points table with the latest update
CREATE OR REPLACE FUNCTION public.update_meeting_point_latest_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_meeting_point_id UUID;
BEGIN
    -- Get meeting_point_id from meeting_point_solutions table
    SELECT meeting_point_id INTO v_meeting_point_id
    FROM public.meeting_point_solutions
    WHERE id = NEW.meeting_point_solution_id;
    
    -- Only update if we found a meeting_point_id
    IF v_meeting_point_id IS NOT NULL THEN
        -- Update the meeting_points table with the latest update
        UPDATE public.meeting_points 
        SET 
            updates = NEW.update_details,
            updated_at = NEW.created_at
        WHERE id = v_meeting_point_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix function: update_meeting_point_on_update_change
-- This function syncs the meeting_points table when updates change
CREATE OR REPLACE FUNCTION public.update_meeting_point_on_update_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_meeting_point_id UUID;
BEGIN
    -- Get meeting_point_id from meeting_point_solutions table
    SELECT meeting_point_id INTO v_meeting_point_id
    FROM public.meeting_point_solutions
    WHERE id = COALESCE(NEW.meeting_point_solution_id, OLD.meeting_point_solution_id);
    
    -- Only update if we found a meeting_point_id
    IF v_meeting_point_id IS NOT NULL THEN
        -- Get the most recent update for this meeting point
        UPDATE public.meeting_points 
        SET 
            updates = (
                SELECT update_details 
                FROM public.meeting_point_updates 
                INNER JOIN public.meeting_point_solutions 
                    ON meeting_point_updates.meeting_point_solution_id = meeting_point_solutions.id
                WHERE meeting_point_solutions.meeting_point_id = v_meeting_point_id
                ORDER BY meeting_point_updates.created_at DESC 
                LIMIT 1
            ),
            updated_at = now()
        WHERE id = v_meeting_point_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.update_meeting_point_latest_update() IS 'Updates meeting_points table with latest update. Now uses meeting_point_solution_id to find the meeting_point_id.';
COMMENT ON FUNCTION public.update_meeting_point_on_update_change() IS 'Syncs meeting_points table when updates change. Now uses meeting_point_solution_id to find the meeting_point_id.';

