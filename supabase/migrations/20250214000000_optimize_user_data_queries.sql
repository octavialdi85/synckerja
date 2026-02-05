-- Optimize "User data query" used by CentralizedUserDataContext
-- Speeds up profile → org → employee/role lookups and reduces timeout risk

-- user_organizations: lookup by user_id + organization_id (verify active access)
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org
  ON user_organizations(user_id, organization_id);

-- user_organizations: "first active org" query (user_id, is_active, order by joined_at desc limit 1)
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_active_joined
  ON user_organizations(user_id, joined_at DESC NULLS LAST)
  WHERE is_active = true;

-- employees: lookup by user_id + organization_id (CentralizedUserDataContext, useCurrentEmployee, etc.)
CREATE INDEX IF NOT EXISTS idx_employees_user_org
  ON employees(user_id, organization_id);

-- user_roles: lookup by user_id + organization_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_org
  ON user_roles(user_id, organization_id);

COMMENT ON INDEX idx_user_organizations_user_org IS 'Speeds up user_organizations lookup by user_id and organization_id (user data flow)';
COMMENT ON INDEX idx_user_organizations_user_active_joined IS 'Speeds up "first active org" query for user data context';
COMMENT ON INDEX idx_employees_user_org IS 'Speeds up employee lookup by user_id and organization_id (user data flow)';
COMMENT ON INDEX idx_user_roles_user_org IS 'Speeds up user_roles lookup by user_id and organization_id (user data flow)';
