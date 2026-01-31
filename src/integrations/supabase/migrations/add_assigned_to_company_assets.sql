-- Current custodian when asset status is in-use.

ALTER TABLE company_assets
ADD COLUMN IF NOT EXISTS assigned_to_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE company_assets
ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_company_assets_assigned_to_employee
ON company_assets(assigned_to_employee_id) WHERE assigned_to_employee_id IS NOT NULL;

COMMENT ON COLUMN company_assets.assigned_to_employee_id IS 'Current custodian employee (when status is in-use)';
COMMENT ON COLUMN company_assets.assigned_at IS 'When current assignment started';
