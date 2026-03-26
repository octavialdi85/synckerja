-- Audit dependencies before dropping public.employees.status
-- Run in SQL editor and review all result sets.

-- 1) Check employees that still miss employee_status_id
select
  e.id,
  e.employee_id,
  e.full_name,
  e.email,
  e.employee_status_id
from public.employees e
where e.employee_status_id is null
order by e.created_at desc;

-- 2) Check active status rows by canonical relation
select
  s.name as status_name,
  count(*) as total
from public.employees e
left join public.employee_statuses s on s.id = e.employee_status_id
group by s.name
order by total desc;

-- 3) Find DB functions that reference employees.status
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%employees.status%'
order by schema_name, function_name;

-- 4) Find views that reference employees.status
select
  schemaname,
  viewname
from pg_views
where definition ilike '%employees.status%'
order by schemaname, viewname;

-- 5) Find policies that reference status on employees
select
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
from pg_policies
where (qual ilike '%status%' or with_check ilike '%status%')
  and tablename = 'employees'
order by schemaname, tablename, policyname;

-- 6) Find indexes involving status on employees
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'employees'
  and indexdef ilike '%status%'
order by indexname;
