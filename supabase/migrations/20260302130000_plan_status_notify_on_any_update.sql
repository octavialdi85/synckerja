-- Trigger "AFTER UPDATE OF status, production_status, done" only runs when the UPDATE
-- statement explicitly sets one of those columns. When done is set to true by the
-- BEFORE trigger (trg_social_media_plan_completion) after post_link is updated,
-- "done" is not in the SET list so the notify trigger never ran.
-- Fix: run on any UPDATE; the function already returns early if nothing changed.

DROP TRIGGER IF EXISTS after_social_media_plans_status_change_notify ON public.social_media_plans;

CREATE TRIGGER after_social_media_plans_status_change_notify
  AFTER UPDATE ON public.social_media_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_plan_status_change();

COMMENT ON TRIGGER after_social_media_plans_status_change_notify ON public.social_media_plans IS
  'Notify org members when status, production_status, or done changes (including when done is set by completion trigger on post_link update).';
