-- Manual rollback script for 20260402090000_drop_employees_status_column.sql

-- 1) Add back status column
alter table public.employees
add column if not exists status text;

-- 2) Rehydrate status from employee_statuses relation
update public.employees e
set status = lower(es.name)
from public.employee_statuses es
where e.employee_status_id = es.id
  and (e.status is null or e.status = '');

-- 3) Recreate legacy indexes
create index if not exists idx_employees_organization_id_status
on public.employees(organization_id, status);

create index if not exists idx_employees_org_status_pending
on public.employees(organization_id, status, pending_removal)
where status = 'active' and pending_removal = true;

-- 4) Optionally drop replacement index if rollback requires full legacy shape
drop index if exists public.idx_employees_org_employee_status;
