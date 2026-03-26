-- Backfill employee_status_id for rows that are still null.
-- Assumption:
-- - If employee_status_id is null, map to organization status named 'active' first.
-- - If no org-specific status exists, use global default status named 'active' (organization_id is null).

-- Dry-run preview (no writes)
with active_status as (
  select
    e.id as employee_row_id,
    coalesce(org_status.id, global_status.id) as resolved_status_id
  from public.employees e
  left join lateral (
    select es.id
    from public.employee_statuses es
    where es.organization_id = e.organization_id
      and lower(es.name) = 'active'
    order by es.created_at asc
    limit 1
  ) org_status on true
  left join lateral (
    select es.id
    from public.employee_statuses es
    where es.organization_id is null
      and lower(es.name) = 'active'
    order by es.created_at asc
    limit 1
  ) global_status on true
  where e.employee_status_id is null
)
select
  count(*) as rows_needing_backfill,
  count(*) filter (where resolved_status_id is not null) as resolvable_rows,
  count(*) filter (where resolved_status_id is null) as unresolved_rows
from active_status;

-- Apply backfill
with active_status as (
  select
    e.id as employee_row_id,
    coalesce(org_status.id, global_status.id) as resolved_status_id
  from public.employees e
  left join lateral (
    select es.id
    from public.employee_statuses es
    where es.organization_id = e.organization_id
      and lower(es.name) = 'active'
    order by es.created_at asc
    limit 1
  ) org_status on true
  left join lateral (
    select es.id
    from public.employee_statuses es
    where es.organization_id is null
      and lower(es.name) = 'active'
    order by es.created_at asc
    limit 1
  ) global_status on true
  where e.employee_status_id is null
)
update public.employees e
set employee_status_id = a.resolved_status_id
from active_status a
where e.id = a.employee_row_id
  and a.resolved_status_id is not null;

-- Post-check unresolved rows
select
  e.id,
  e.employee_id,
  e.full_name,
  e.organization_id
from public.employees e
where e.employee_status_id is null
order by e.created_at desc;
