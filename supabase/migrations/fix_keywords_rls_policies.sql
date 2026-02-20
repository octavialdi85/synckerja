-- Fix RLS policies for keywords table
-- The original policies incorrectly checked organization_id in profiles table
-- Profiles table uses active_organization_id instead

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view keywords from their organization" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords for their organization" ON keywords;
DROP POLICY IF EXISTS "Users can update keywords from their organization" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords from their organization" ON keywords;

-- Policy: Users can view keywords from their organization
CREATE POLICY "Users can view keywords from their organization"
  ON keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can insert keywords for their organization
CREATE POLICY "Users can insert keywords for their organization"
  ON keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can update keywords from their organization
CREATE POLICY "Users can update keywords from their organization"
  ON keywords FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

-- Policy: Users can delete keywords from their organization
CREATE POLICY "Users can delete keywords from their organization"
  ON keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.active_organization_id = keywords.organization_id
    )
  );

