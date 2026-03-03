-- Sync lead_status_id (and assignee_id where applicable) from email_conversations and instagram_conversations
-- to leads when conversation is updated. Same behavior as whatsapp_conversations trigger.

-- -------- Email: lead_status_id only (email_conversations has no assignee_id) --------
-- Ticket format in app: EMAIL- + first 8 chars of id (uppercase, no dashes)

CREATE OR REPLACE FUNCTION public.sync_email_conv_status_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id text;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_ticket_id := 'EMAIL-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));

  UPDATE public.leads
  SET
    status_id = NEW.lead_status_id,
    updated_at = now()
  WHERE
    organization_id = NEW.organization_id
    AND ticket_id IS NOT NULL
    AND TRIM(ticket_id) <> ''
    AND (ticket_id = v_ticket_id OR UPPER(TRIM(ticket_id)) = v_ticket_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_email_conv_status_to_lead_trigger ON public.email_conversations;

CREATE TRIGGER sync_email_conv_status_to_lead_trigger
  AFTER UPDATE OF lead_status_id ON public.email_conversations
  FOR EACH ROW
  WHEN (OLD.lead_status_id IS DISTINCT FROM NEW.lead_status_id)
  EXECUTE FUNCTION public.sync_email_conv_status_to_lead();

COMMENT ON FUNCTION public.sync_email_conv_status_to_lead() IS 'Syncs lead_status_id from email_conversations to leads by ticket_id (EMAIL-xxxxxxxx) so leads-management table stays in sync with quick action.';


-- -------- Instagram: lead_status_id and assignee_id --------
-- ticket_id in instagram_conversations can be stored or derived as IG- + 8 chars from id

CREATE OR REPLACE FUNCTION public.sync_instagram_conv_status_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id text;
BEGIN
  v_ticket_id := COALESCE(NULLIF(TRIM(NEW.ticket_id), ''), 'IG-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8)));
  IF v_ticket_id = '' OR NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.leads
  SET
    status_id = NEW.lead_status_id,
    assignee_id = NEW.assignee_id,
    updated_at = now()
  WHERE
    organization_id = NEW.organization_id
    AND ticket_id IS NOT NULL
    AND TRIM(ticket_id) <> ''
    AND (ticket_id = v_ticket_id OR UPPER(TRIM(ticket_id)) = UPPER(v_ticket_id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_instagram_conv_status_to_lead_trigger ON public.instagram_conversations;

CREATE TRIGGER sync_instagram_conv_status_to_lead_trigger
  AFTER UPDATE OF lead_status_id, assignee_id ON public.instagram_conversations
  FOR EACH ROW
  WHEN (
    OLD.lead_status_id IS DISTINCT FROM NEW.lead_status_id
    OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id
  )
  EXECUTE FUNCTION public.sync_instagram_conv_status_to_lead();

COMMENT ON FUNCTION public.sync_instagram_conv_status_to_lead() IS 'Syncs lead_status_id and assignee_id from instagram_conversations to leads by ticket_id so leads-management table stays in sync with quick action.';
