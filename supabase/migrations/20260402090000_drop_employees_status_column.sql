-- Deprecate legacy employees.status column
-- Preconditions:
-- 1) employee_status_id is fully populated
-- 2) no runtime/DB dependencies remain on employees.status

-- Drop indexes depending on status
drop index if exists public.idx_employees_organization_id_status;
drop index if exists public.idx_employees_org_status_pending;

-- Add replacement index for common filtering by org + employee_status_id
create index if not exists idx_employees_org_employee_status
on public.employees(organization_id, employee_status_id);

-- Keep pending removal index path performant
create index if not exists idx_employees_org_pending_removal
on public.employees(organization_id, pending_removal)
where pending_removal = true;

-- Remove legacy column
alter table public.employees
drop column if exists status;
