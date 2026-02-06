-- Auto-sync followup count and fu_priority to whatsapp_conversations and leads
-- when lead_follow_up_updates changes (so FU Priority updates without opening the dialog).
-- Logic: same as client (Hot/Warm/Cold percentage; tie-break Hot > Warm > Cold).

CREATE OR REPLACE FUNCTION public.sync_follow_up_priority_for_conversation(p_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hot_cnt int;
  warm_cnt int;
  cold_cnt int;
  total_cnt int;
  fp text;
BEGIN
  IF p_conv_id IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'hot prospect'),
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'warm prospect'),
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'cold prospect'),
    COUNT(*)
  INTO hot_cnt, warm_cnt, cold_cnt, total_cnt
  FROM lead_follow_up_updates
  WHERE conversation_id = p_conv_id;

  IF total_cnt = 0 THEN fp := NULL;
  ELSIF (hot_cnt::float / total_cnt) >= (warm_cnt::float / total_cnt) AND (hot_cnt::float / total_cnt) >= (cold_cnt::float / total_cnt) AND hot_cnt > 0 THEN fp := 'High';
  ELSIF (warm_cnt::float / total_cnt) >= (hot_cnt::float / total_cnt) AND (warm_cnt::float / total_cnt) >= (cold_cnt::float / total_cnt) AND warm_cnt > 0 THEN fp := 'Medium';
  ELSIF cold_cnt > 0 THEN fp := 'Low';
  ELSE fp := NULL;
  END IF;

  UPDATE whatsapp_conversations
  SET followup = total_cnt, fu_priority = fp, updated_at = NOW()
  WHERE id = p_conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_follow_up_priority_for_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hot_cnt int;
  warm_cnt int;
  cold_cnt int;
  total_cnt int;
  fp text;
BEGIN
  IF p_lead_id IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'hot prospect'),
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'warm prospect'),
    COUNT(*) FILTER (WHERE LOWER(TRIM(REGEXP_REPLACE(COALESCE(status, ''), '\s+', ' ', 'g'))) = 'cold prospect'),
    COUNT(*)
  INTO hot_cnt, warm_cnt, cold_cnt, total_cnt
  FROM lead_follow_up_updates
  WHERE lead_id = p_lead_id;

  IF total_cnt = 0 THEN fp := NULL;
  ELSIF (hot_cnt::float / total_cnt) >= (warm_cnt::float / total_cnt) AND (hot_cnt::float / total_cnt) >= (cold_cnt::float / total_cnt) AND hot_cnt > 0 THEN fp := 'High';
  ELSIF (warm_cnt::float / total_cnt) >= (hot_cnt::float / total_cnt) AND (warm_cnt::float / total_cnt) >= (cold_cnt::float / total_cnt) AND warm_cnt > 0 THEN fp := 'Medium';
  ELSIF cold_cnt > 0 THEN fp := 'Low';
  ELSE fp := NULL;
  END IF;

  UPDATE leads
  SET followup = total_cnt, fu_priority = fp, updated_at = NOW()
  WHERE id = p_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_follow_up_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_follow_up_priority_for_conversation(OLD.conversation_id);
    PERFORM sync_follow_up_priority_for_lead(OLD.lead_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM sync_follow_up_priority_for_conversation(NEW.conversation_id);
    PERFORM sync_follow_up_priority_for_lead(NEW.lead_id);
    RETURN NEW;
  ELSE
    PERFORM sync_follow_up_priority_for_conversation(NEW.conversation_id);
    PERFORM sync_follow_up_priority_for_conversation(OLD.conversation_id);
    PERFORM sync_follow_up_priority_for_lead(NEW.lead_id);
    PERFORM sync_follow_up_priority_for_lead(OLD.lead_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sync_fu_priority_after_lead_follow_up_updates ON public.lead_follow_up_updates;
CREATE TRIGGER sync_fu_priority_after_lead_follow_up_updates
  AFTER INSERT OR UPDATE OR DELETE ON public.lead_follow_up_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_follow_up_priority();
