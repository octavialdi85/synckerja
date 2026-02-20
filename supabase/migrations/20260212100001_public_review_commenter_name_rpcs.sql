-- Update get_public_review_comments: show commenter_display_name when set, else profile name, else Anonim
CREATE OR REPLACE FUNCTION public.get_public_review_comments(token_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_link_url TEXT;
  v_comments JSON;
BEGIN
  SELECT social_media_plan_id, link_url
  INTO v_plan_id, v_link_url
  FROM public.public_review_tokens
  WHERE token = token_param
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', lc.id,
      'social_media_plan_id', lc.social_media_plan_id,
      'link_url', lc.link_url,
      'comment_text', lc.comment_text,
      'created_by', lc.created_by,
      'created_at', lc.created_at,
      'updated_at', lc.updated_at,
      'video_timestamp_seconds', lc.video_timestamp_seconds,
      'annotation_data', lc.annotation_data,
      'creator_display_name', CASE
        WHEN lc.commenter_display_name IS NOT NULL AND trim(lc.commenter_display_name) <> '' THEN trim(lc.commenter_display_name)
        WHEN lc.created_by IS NOT NULL THEN COALESCE((SELECT p.full_name FROM public.profiles p WHERE p.user_id = lc.created_by LIMIT 1), 'Unknown')
        ELSE 'Anonim'
      END
    ) ORDER BY lc.created_at ASC
  ), '[]'::JSON) INTO v_comments
  FROM public.link_comments lc
  WHERE lc.social_media_plan_id = v_plan_id
    AND lc.link_url = v_link_url;

  RETURN v_comments;
END;
$$;

-- Update insert_public_review_comment: require commenter_display_name, store it, return it
CREATE OR REPLACE FUNCTION public.insert_public_review_comment(
  token_param TEXT,
  comment_text TEXT,
  commenter_display_name TEXT,
  video_timestamp_seconds NUMERIC DEFAULT NULL,
  annotation_data JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_link_url TEXT;
  v_inserted_id UUID;
  v_inserted_row link_comments%ROWTYPE;
  v_name TEXT;
BEGIN
  IF comment_text IS NULL OR trim(comment_text) = '' THEN
    RAISE EXCEPTION 'comment_text is required';
  END IF;

  v_name := trim(commenter_display_name);
  IF v_name = '' THEN
    RAISE EXCEPTION 'commenter_display_name is required';
  END IF;

  SELECT social_media_plan_id, link_url
  INTO v_plan_id, v_link_url
  FROM public.public_review_tokens
  WHERE token = token_param
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired review link';
  END IF;

  INSERT INTO public.link_comments (
    social_media_plan_id,
    link_url,
    comment_text,
    created_by,
    commenter_display_name,
    video_timestamp_seconds,
    annotation_data
  ) VALUES (
    v_plan_id,
    v_link_url,
    trim(comment_text),
    NULL,
    v_name,
    video_timestamp_seconds,
    annotation_data
  )
  RETURNING id INTO v_inserted_id;

  SELECT * INTO v_inserted_row
  FROM public.link_comments
  WHERE id = v_inserted_id;

  RETURN json_build_object(
    'id', v_inserted_row.id,
    'social_media_plan_id', v_inserted_row.social_media_plan_id,
    'link_url', v_inserted_row.link_url,
    'comment_text', v_inserted_row.comment_text,
    'created_by', v_inserted_row.created_by,
    'created_at', v_inserted_row.created_at,
    'updated_at', v_inserted_row.updated_at,
    'video_timestamp_seconds', v_inserted_row.video_timestamp_seconds,
    'annotation_data', v_inserted_row.annotation_data,
    'creator_display_name', v_inserted_row.commenter_display_name
  );
END;
$$;

COMMENT ON FUNCTION public.insert_public_review_comment(TEXT, TEXT, TEXT, NUMERIC, JSONB) IS 'Insert a public comment with commenter display name (no auth). Name required; stored per token in localStorage on client.';
