-- Trigger: ensure read_at NULL is explicit timestamptz to avoid "expression is of type text" in INSERT
CREATE OR REPLACE FUNCTION public.trigger_notify_review_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_plan_title TEXT;
BEGIN
  SELECT token INTO v_token
  FROM public.public_review_tokens
  WHERE social_media_plan_id = NEW.social_media_plan_id
  LIMIT 1;

  SELECT title INTO v_plan_title
  FROM public.social_media_plans
  WHERE id = NEW.social_media_plan_id;

  IF v_token IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.review_comment_notifications (
    user_id,
    link_comment_id,
    social_media_plan_id,
    review_token,
    plan_title,
    commenter_display_name,
    read_at,
    created_at
  )
  SELECT DISTINCT
    prt.created_by,
    NEW.id,
    NEW.social_media_plan_id,
    v_token,
    v_plan_title,
    trim(COALESCE(NEW.commenter_display_name, '')),
    CAST(NULL AS timestamptz),
    now()
  FROM public.public_review_tokens prt
  WHERE prt.social_media_plan_id = NEW.social_media_plan_id
    AND prt.created_by IS NOT NULL;

  RETURN NEW;
END;
$$;
