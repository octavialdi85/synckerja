-- Migration: Add indexes on employees for list query (organization_id + status, order full_name)
-- Purpose: Reduce 502 / http_response_incomplete on GET /rest/v1/employees by making the query faster
-- Query: select id, full_name, email, status where organization_id = ? and (status = 'active' or status is null) order by full_name asc
-- Date: 2025-02-12
--
-- Rekomendasi tambahan jika 502 masih muncul: cek Supabase Dashboard (insiden/overload/connection pool)
-- dan pastikan timeout REST di client sudah dinaikkan (client.ts: 25s untuk REST).

-- Index for filter by organization_id + status (supports .eq('organization_id').or('status.eq.active,status.is.null'))
CREATE INDEX IF NOT EXISTS idx_employees_organization_id_status
ON public.employees(organization_id, status);

-- Index for filter by organization_id + order by full_name (supports .eq('organization_id').order('full_name'))
CREATE INDEX IF NOT EXISTS idx_employees_organization_id_full_name
ON public.employees(organization_id, full_name);

COMMENT ON INDEX idx_employees_organization_id_status IS 'Supports employees list filter by org and status (active/null).';
COMMENT ON INDEX idx_employees_organization_id_full_name IS 'Supports employees list filter by org and order by full_name.';
