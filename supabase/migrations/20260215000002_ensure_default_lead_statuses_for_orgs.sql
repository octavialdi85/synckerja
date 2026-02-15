-- Ensure every org that has livechat conversations has at least default lead_statuses
-- (Open, In Progress, Converted, Qualified, Closed) so auto-resolve and UI work.
-- Only inserts for orgs that currently have zero lead_statuses.

INSERT INTO public.lead_statuses (id, name, description, color, is_active, sort_order, organization_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.name,
  NULL,
  NULL,
  TRUE,
  s.sort_order,
  o.id,
  NOW(),
  NOW()
FROM (
  SELECT 1 AS sort_order, 'Open' AS name
  UNION ALL SELECT 2, 'In Progress'
  UNION ALL SELECT 3, 'Converted'
  UNION ALL SELECT 4, 'Qualified'
  UNION ALL SELECT 5, 'Closed'
) s
CROSS JOIN (
  SELECT DISTINCT o.id
  FROM public.organizations o
  WHERE EXISTS (
    SELECT 1 FROM public.whatsapp_conversations w WHERE w.organization_id = o.id
    UNION
    SELECT 1 FROM public.email_conversations e WHERE e.organization_id = o.id
    UNION
    SELECT 1 FROM public.instagram_conversations i WHERE i.organization_id = o.id
  )
  AND NOT EXISTS (SELECT 1 FROM public.lead_statuses ls WHERE ls.organization_id = o.id)
) o;

-- We only select orgs that have ZERO lead_statuses, then insert 5 rows per org.
-- If migration runs twice, second run: NOT EXISTS will be false for those orgs, so no rows to insert.

COMMENT ON TABLE public.lead_statuses IS 'Lead statuses per organization. Default set (Open, In Progress, Converted, Qualified, Closed) can be ensured by migration 20260215000002 for orgs with conversations.';
