-- Enable Row Level Security (RLS) on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update active_organization_id in their profile" ON profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can view profiles of users in the same organization
-- This allows users within an organization to see each other's basic profile info
CREATE POLICY "Users can view profiles in same organization"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles AS current_user_profile
      WHERE current_user_profile.user_id = auth.uid()
        AND current_user_profile.active_organization_id IS NOT NULL
        AND current_user_profile.active_organization_id = profiles.active_organization_id
        AND profiles.active_organization_id IS NOT NULL
    )
  );

-- Policy 3: Users can insert their own profile
-- This allows users to create their own profile record
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own profile
-- Users can update most fields in their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can update active_organization_id to switch organizations
-- This allows users to change their active organization
CREATE POLICY "Users can update active_organization_id in their profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM user_organizations
      WHERE user_id = auth.uid()
        AND organization_id = NEW.active_organization_id
    )
  );

-- Add comment to document the RLS policies
COMMENT ON TABLE profiles IS 'User profiles with RLS enabled. Users can view their own profile and profiles in the same organization. Users can insert and update their own profile.';

































































