-- Migration: Create product_knowledge_features table and point product_knowledge.feature_id to it
-- Master features (name, description, solution, competitive_advantage) live here; product_knowledge rows reference by feature_id.

CREATE TABLE IF NOT EXISTS public.product_knowledge_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    feature_name VARCHAR(500) NOT NULL,
    feature_description TEXT,
    solution TEXT,
    competitive_advantage JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_knowledge_features_organization_id
    ON public.product_knowledge_features(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_features_name
    ON public.product_knowledge_features(organization_id, feature_name);

CREATE OR REPLACE FUNCTION update_product_knowledge_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_knowledge_features_updated_at ON public.product_knowledge_features;
CREATE TRIGGER trigger_update_product_knowledge_features_updated_at
    BEFORE UPDATE ON public.product_knowledge_features
    FOR EACH ROW
    EXECUTE FUNCTION update_product_knowledge_features_updated_at();

ALTER TABLE public.product_knowledge_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their product_knowledge_features"
    ON public.product_knowledge_features FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_features.organization_id
        )
    );

CREATE POLICY "Organizations can insert their product_knowledge_features"
    ON public.product_knowledge_features FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_features.organization_id
        )
    );

CREATE POLICY "Organizations can update their product_knowledge_features"
    ON public.product_knowledge_features FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_features.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_features.organization_id
        )
    );

CREATE POLICY "Organizations can delete their product_knowledge_features"
    ON public.product_knowledge_features FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_features.organization_id
        )
    );

COMMENT ON TABLE public.product_knowledge_features IS
    'Master features for product knowledge: feature name, description, solution, competitive advantage. Referenced by product_knowledge.feature_id';

-- Point product_knowledge.feature_id to the new table (drop self-FK if exists, add new FK)
ALTER TABLE public.product_knowledge
    DROP CONSTRAINT IF EXISTS product_knowledge_feature_id_fkey;

ALTER TABLE public.product_knowledge
    ADD CONSTRAINT product_knowledge_feature_id_fkey
    FOREIGN KEY (feature_id) REFERENCES public.product_knowledge_features(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.product_knowledge.feature_id IS
    'Optional FK to product_knowledge_features.id. When set, feature name/description/solution/advantage can be pre-filled from that master.';
