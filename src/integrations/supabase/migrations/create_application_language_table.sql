-- ============================================
-- CREATE APPLICATION_LANGUAGE TABLE
-- ============================================
-- Table untuk menyimpan bahasa aplikasi (Indonesia/Inggris)
-- per organization menggunakan boolean
-- 
-- Columns:
-- - id: UUID primary key
-- - organization_id: UUID foreign key ke organizations (UNIQUE)
-- - is_indonesian: BOOLEAN (true = Indonesia, false = Inggris)
-- - created_by: UUID foreign key ke auth.users (optional)
-- - created_at: TIMESTAMPTZ auto-generated
-- - updated_at: TIMESTAMPTZ auto-updated via trigger
-- 
-- Constraints:
-- - UNIQUE(organization_id): One language setting per organization
-- - RLS enabled: Users can only access their organization's language setting
-- ============================================

BEGIN;

-- Create application_language table
CREATE TABLE IF NOT EXISTS public.application_language (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_indonesian BOOLEAN NOT NULL DEFAULT true, -- true = Indonesia, false = Inggris
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one language setting per organization
  CONSTRAINT unique_organization_language UNIQUE (organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_application_language_organization_id 
  ON public.application_language(organization_id);

CREATE INDEX IF NOT EXISTS idx_application_language_is_indonesian 
  ON public.application_language(is_indonesian);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_application_language_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_application_language_updated_at ON public.application_language;
CREATE TRIGGER trigger_update_application_language_updated_at
  BEFORE UPDATE ON public.application_language
  FOR EACH ROW
  EXECUTE FUNCTION update_application_language_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.application_language IS 
'Stores application language preference (Indonesian/English) per organization';

COMMENT ON COLUMN public.application_language.organization_id IS 
'Foreign key to organizations table - one language setting per organization';

COMMENT ON COLUMN public.application_language.is_indonesian IS 
'true = Indonesian (Bahasa Indonesia), false = English';

COMMENT ON COLUMN public.application_language.created_by IS 
'User who created the language setting';

-- Enable Row Level Security (RLS)
ALTER TABLE public.application_language ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view language settings for their organization
CREATE POLICY "Users can view language settings for their organization"
  ON public.application_language
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert language settings for their organization
CREATE POLICY "Users can insert language settings for their organization"
  ON public.application_language
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update language settings for their organization
CREATE POLICY "Users can update language settings for their organization"
  ON public.application_language
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.employees 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

COMMIT;













