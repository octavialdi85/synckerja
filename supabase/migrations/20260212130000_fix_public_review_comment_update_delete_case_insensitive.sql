-- Update: case-insensitive match for commenter_display_name so edit/delete works regardless of name casing
CREATE OR REPLACE FUNCTION public.update_public_review_comment(
  comment_id UUID,
  token_param TEXT,
  commenter_display_name TEXT,
  new_comment_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_name TEXT;
  v_updated link_comments%ROWTYPE;
BEGIN
  IF new_comment_text IS NULL OR trim(new_comment_text) = '' THEN
    RAISE EXCEPTION 'new_comment_text is required';
  END IF;

  v_name := trim(commenter_display_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'commenter_display_name is required';
  END IF;

  SELECT social_media_plan_id INTO v_plan_id
  FROM public.public_review_tokens
  WHERE token = token_param
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired review link';
  END IF;

  UPDATE public.link_comments lc
  SET comment_text = trim(new_comment_text),
      updated_at = now()
  WHERE lc.id = comment_id
    AND lc.social_media_plan_id = v_plan_id
    AND lc.created_by IS NULL
    AND LOWER(trim(COALESCE(lc.commenter_display_name, ''))) = LOWER(v_name);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found or you are not the author';
  END IF;

  SELECT * INTO v_updated FROM public.link_comments WHERE id = comment_id;

  RETURN json_build_object(
    'id', v_updated.id,
    'social_media_plan_id', v_updated.social_media_plan_id,
    'comment_text', v_updated.comment_text,
    'created_by', v_updated.created_by,
    'created_at', v_updated.created_at,
    'updated_at', v_updated.updated_at,
    'video_timestamp_seconds', v_updated.video_timestamp_seconds,
    'annotation_data', v_updated.annotation_data,
    'creator_display_name', v_updated.commenter_display_name
  );
END;
$$;

-- Delete: case-insensitive match
CREATE OR REPLACE FUNCTION public.delete_public_review_comment(
  comment_id UUID,
  token_param TEXT,
  commenter_display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_name TEXT;
BEGIN
  v_name := trim(commenter_display_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'commenter_display_name is required';
  END IF;

  SELECT social_media_plan_id INTO v_plan_id
  FROM public.public_review_tokens
  WHERE token = token_param
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired review link';
  END IF;

  DELETE FROM public.link_comments lc
  WHERE lc.id = comment_id
    AND lc.social_media_plan_id = v_plan_id
    AND lc.created_by IS NULL
    AND LOWER(trim(COALESCE(lc.commenter_display_name, ''))) = LOWER(v_name);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found or you are not the author';
  END IF;

  RETURN TRUE;
END;
$$;
