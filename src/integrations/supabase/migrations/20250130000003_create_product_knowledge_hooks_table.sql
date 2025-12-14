-- Migration: Create product_knowledge_hooks table
-- Description: Stores hooks for product knowledge content
-- Created: 2025-01-30

CREATE TABLE IF NOT EXISTS public.product_knowledge_hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hook_content TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_knowledge_hooks_organization_id 
    ON public.product_knowledge_hooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_hooks_name 
    ON public.product_knowledge_hooks(organization_id, name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_knowledge_hooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_product_knowledge_hooks_updated_at ON public.product_knowledge_hooks;
CREATE TRIGGER trigger_update_product_knowledge_hooks_updated_at
    BEFORE UPDATE ON public.product_knowledge_hooks
    FOR EACH ROW
    EXECUTE FUNCTION update_product_knowledge_hooks_updated_at();

-- Enable RLS
ALTER TABLE public.product_knowledge_hooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
    );

CREATE POLICY "Organizations can insert their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
    );

CREATE POLICY "Organizations can update their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
    );

CREATE POLICY "Organizations can delete their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
    );

-- Comments
COMMENT ON TABLE public.product_knowledge_hooks IS 
'Stores hooks for product knowledge content';
COMMENT ON COLUMN public.product_knowledge_hooks.name IS 
'Name of the hook';
COMMENT ON COLUMN public.product_knowledge_hooks.description IS 
'Description of the hook (optional)';
COMMENT ON COLUMN public.product_knowledge_hooks.hook_content IS 
'Content of the hook (optional)';

