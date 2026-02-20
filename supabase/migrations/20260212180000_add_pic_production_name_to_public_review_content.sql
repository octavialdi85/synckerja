-- Add pic_production_name to public review content RPC
CREATE OR REPLACE FUNCTION public.get_public_review_content_by_token(token_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_link_url TEXT;
  v_result JSON;
BEGIN
  SELECT social_media_plan_id, link_url
  INTO v_plan_id, v_link_url
  FROM public.public_review_tokens
  WHERE token = token_param
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'social_media_plan_id', smp.id,
    'link_url', v_link_url,
    'title', smp.title,
    'post_date', smp.post_date,
    'google_drive_link', smp.google_drive_link,
    'content_type_name', ct.name,
    'service_name', s.name,
    'sub_service_name', ss.name,
    'pic_production_name', pic_production_emp.full_name
  ) INTO v_result
  FROM public.social_media_plans smp
  LEFT JOIN public.content_types ct ON ct.id = smp.content_type_id
  LEFT JOIN public.services s ON s.id = smp.service_id
  LEFT JOIN public.sub_services ss ON ss.id = smp.sub_service_id
  LEFT JOIN public.employees pic_production_emp ON pic_production_emp.id = smp.pic_production_id
  WHERE smp.id = v_plan_id;

  RETURN v_result;
END;
$$;
