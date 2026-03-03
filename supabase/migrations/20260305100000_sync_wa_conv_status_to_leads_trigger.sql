-- Sync lead_status_id and assignee_id from whatsapp_conversations to leads when conversation is updated.
-- Email and Instagram have the same sync via 20260305110000_sync_email_instagram_conv_status_to_leads_trigger.sql.

CREATE OR REPLACE FUNCTION public.sync_wa_conv_status_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id text;
BEGIN
  -- Use conversation ticket_id (generated column for WA is always set)
  v_ticket_id := COALESCE(TRIM(NEW.ticket_id), '');
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

DROP TRIGGER IF EXISTS sync_wa_conv_status_to_lead_trigger ON public.whatsapp_conversations;

CREATE TRIGGER sync_wa_conv_status_to_lead_trigger
  AFTER UPDATE OF lead_status_id, assignee_id ON public.whatsapp_conversations
  FOR EACH ROW
  WHEN (
    OLD.lead_status_id IS DISTINCT FROM NEW.lead_status_id
    OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id
  )
  EXECUTE FUNCTION public.sync_wa_conv_status_to_lead();

COMMENT ON FUNCTION public.sync_wa_conv_status_to_lead() IS 'Syncs lead_status_id and assignee_id from whatsapp_conversations to leads by ticket_id so leads-management table stays in sync with quick action.';
