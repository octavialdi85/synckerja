-- Add push_sent_at to plan_status_change_notifications so we can process pending
-- push notifications via a scheduled Edge Function (avoids pg_net DNS issue when
-- calling same-project Edge Function from Database Webhook).

ALTER TABLE public.plan_status_change_notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_plan_status_change_notifications_pending_push
  ON public.plan_status_change_notifications (created_at)
  WHERE push_sent_at IS NULL;

COMMENT ON COLUMN public.plan_status_change_notifications.push_sent_at IS 'Set when FCM push for this row has been sent (by app-notifications-process-pending or webhook).';
