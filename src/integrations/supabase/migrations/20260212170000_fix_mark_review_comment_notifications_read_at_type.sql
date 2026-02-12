-- Ensure read_at is set with explicit timestamptz to avoid "expression is of type text" errors
CREATE OR REPLACE FUNCTION public.mark_review_comment_notifications_read(notification_ids UUID[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF notification_ids IS NULL OR array_length(notification_ids, 1) IS NULL THEN
    UPDATE public.review_comment_notifications
    SET read_at = (now() AT TIME ZONE 'UTC')::timestamptz
    WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.review_comment_notifications
    SET read_at = (now() AT TIME ZONE 'UTC')::timestamptz
    WHERE user_id = auth.uid() AND id = ANY(notification_ids);
  END IF;
END;
$$;
