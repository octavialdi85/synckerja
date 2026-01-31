-- History of asset custody: assign, handover, return; one row per period with document.

CREATE TABLE IF NOT EXISTS asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES company_assets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL,
  ended_at timestamptz,
  assigned_by uuid NOT NULL,
  document_path text NOT NULL,
  handover_type text NOT NULL CHECK (handover_type IN ('initial_assignment','transfer','resignation','return')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_organization_id ON asset_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_employee_id ON asset_assignments(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_assignments_ended_at ON asset_assignments(ended_at) WHERE ended_at IS NULL;

COMMENT ON TABLE asset_assignments IS 'History of asset custody: assign, handover, return; one row per period with document_path';
COMMENT ON COLUMN asset_assignments.employee_id IS 'Custodian for this period; null when handover_type=return';
COMMENT ON COLUMN asset_assignments.handover_type IS 'initial_assignment, transfer, resignation, return';
