-- Migration: Create product_knowledge_detail table
-- Description: Stores detailed product knowledge information with service and sub service references
-- Created: 2025-01-30

CREATE TABLE IF NOT EXISTS public.product_knowledge_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE SET NULL,
    product_knowledge_content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_knowledge_detail_organization_id 
    ON public.product_knowledge_detail(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_detail_service_id 
    ON public.product_knowledge_detail(service_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_detail_sub_service_id 
    ON public.product_knowledge_detail(sub_service_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_detail_org_service 
    ON public.product_knowledge_detail(organization_id, service_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_knowledge_detail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_product_knowledge_detail_updated_at ON public.product_knowledge_detail;
CREATE TRIGGER trigger_update_product_knowledge_detail_updated_at
    BEFORE UPDATE ON public.product_knowledge_detail
    FOR EACH ROW
    EXECUTE FUNCTION update_product_knowledge_detail_updated_at();

-- Enable RLS
ALTER TABLE public.product_knowledge_detail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their product_knowledge_detail"
    ON public.product_knowledge_detail FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_detail.organization_id
        )
    );

CREATE POLICY "Organizations can insert their product_knowledge_detail"
    ON public.product_knowledge_detail FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_detail.organization_id
        )
    );

CREATE POLICY "Organizations can update their product_knowledge_detail"
    ON public.product_knowledge_detail FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_detail.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_detail.organization_id
        )
    );

CREATE POLICY "Organizations can delete their product_knowledge_detail"
    ON public.product_knowledge_detail FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_detail.organization_id
        )
    );

-- Comments
COMMENT ON TABLE public.product_knowledge_detail IS 
'Stores detailed product knowledge information linked to services and sub services';
COMMENT ON COLUMN public.product_knowledge_detail.product_knowledge_content IS 
'Main content field for storing product knowledge information';
COMMENT ON COLUMN public.product_knowledge_detail.service_id IS 
'Reference to the main service';
COMMENT ON COLUMN public.product_knowledge_detail.sub_service_id IS 
'Reference to the sub service (optional)';

