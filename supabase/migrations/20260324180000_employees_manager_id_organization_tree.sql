-- employees.manager_id: direct manager (single), org chart from this FK.
-- Rules: only organization owner may have NULL manager_id; non-owners must have manager_id.
-- Manager must be same org; same department unless manager is the org owner; no cycles.
-- ON DELETE RESTRICT: cannot delete an employee who still has direct reports.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS manager_id UUID;

-- Pre-migration: every organization that has employees must have at least one employee row
-- whose user_id matches organizations.user_id (org owner), or backfill/trigger cannot be satisfied.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT o.id AS org_id, o.company_name
    FROM organizations o
    WHERE EXISTS (
      SELECT 1 FROM public.employees e WHERE e.organization_id = o.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.organization_id = o.id
        AND e.user_id IS NOT DISTINCT FROM o.user_id
    )
  LOOP
    RAISE EXCEPTION
      'employees_manager_id migration: organization % (%) has employees but no employee row matching organizations.user_id (org owner). Add/fix owner employee first.',
      r.company_name,
      r.org_id;
  END LOOP;
END $$;

-- Owner rows: clear manager
UPDATE public.employees e
SET manager_id = NULL
FROM public.organizations o
WHERE e.organization_id = o.id
  AND e.user_id IS NOT DISTINCT FROM o.user_id;

-- Non-owners: report to org owner (distinct owner per org)
WITH owner_rows AS (
  SELECT DISTINCT ON (e.organization_id)
    e.organization_id,
    e.id AS owner_employee_id
  FROM public.employees e
  INNER JOIN public.organizations o ON o.id = e.organization_id
    AND e.user_id IS NOT DISTINCT FROM o.user_id
  ORDER BY e.organization_id, e.created_at ASC NULLS LAST, e.id ASC
)
UPDATE public.employees e
SET manager_id = ow.owner_employee_id
FROM owner_rows ow
WHERE e.organization_id = ow.organization_id
  AND e.id <> ow.owner_employee_id;

-- FK after backfill (idempotent if re-run: skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_manager_id_fkey'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees (manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id_manager_id ON public.employees (organization_id, manager_id);

CREATE OR REPLACE FUNCTION public.validate_employee_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_owner_user_id UUID;
  v_is_employee_owner BOOLEAN;
  v_mgr RECORD;
  v_mgr_is_owner BOOLEAN;
  cur UUID;
  steps INT := 0;
BEGIN
  SELECT o.user_id INTO v_org_owner_user_id
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;

  v_is_employee_owner := (
    v_org_owner_user_id IS NOT NULL
    AND NEW.user_id IS NOT NULL
    AND NEW.user_id = v_org_owner_user_id
  );

  IF v_is_employee_owner THEN
    IF NEW.manager_id IS NOT NULL THEN
      RAISE EXCEPTION 'Organization owner cannot have a manager (manager_id must be null)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.manager_id IS NULL THEN
    RAISE EXCEPTION 'Non-owner employees must have manager_id set';
  END IF;

  SELECT * INTO v_mgr FROM public.employees WHERE id = NEW.manager_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manager not found for manager_id=%', NEW.manager_id;
  END IF;

  IF v_mgr.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Manager must belong to the same organization';
  END IF;

  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot be their own manager';
  END IF;

  v_mgr_is_owner := (
    v_org_owner_user_id IS NOT NULL
    AND v_mgr.user_id IS NOT NULL
    AND v_mgr.user_id = v_org_owner_user_id
  );

  IF NOT v_mgr_is_owner THEN
    IF NEW.department_id IS NULL OR v_mgr.department_id IS DISTINCT FROM NEW.department_id THEN
      RAISE EXCEPTION 'Manager must be in the same department unless the manager is the organization owner';
    END IF;
  END IF;

  cur := NEW.manager_id;
  WHILE cur IS NOT NULL AND steps < 10000 LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'Manager assignment would create a cycle';
    END IF;
    SELECT e.manager_id INTO cur FROM public.employees e WHERE e.id = cur;
    steps := steps + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_employee_manager ON public.employees;

CREATE TRIGGER trg_validate_employee_manager
  BEFORE INSERT OR UPDATE OF manager_id, department_id, user_id, organization_id
  ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_employee_manager();

COMMENT ON COLUMN public.employees.manager_id IS 'Direct manager (employees.id). NULL only for organization owner row.';
