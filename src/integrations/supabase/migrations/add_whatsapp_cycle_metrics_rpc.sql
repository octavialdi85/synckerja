-- RPC: return cycle rows with conversation assignee for Leads Management metrics.
-- Frontend can filter by date and compute avg response time / avg time to resolve per assignee.
CREATE OR REPLACE FUNCTION public.get_whatsapp_cycle_metrics(p_organization_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  assignee_id UUID,
  cycle_started_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cy.conversation_id,
    c.assignee_id,
    cy.cycle_started_at,
    cy.first_response_at,
    cy.resolved_at
  FROM whatsapp_conversation_cycles cy
  JOIN whatsapp_conversations c ON c.id = cy.conversation_id
  WHERE c.organization_id = p_organization_id
  ORDER BY cy.cycle_started_at DESC;
$$;

COMMENT ON FUNCTION public.get_whatsapp_cycle_metrics(UUID) IS 'Returns WhatsApp conversation cycles with assignee for response time and time-to-resolve metrics in Leads Management.';
