-- Digital Assets: characters and objects per organization (Settings > Digital Assets)
CREATE TABLE IF NOT EXISTS public.digital_asset_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    age TEXT,
    nationality TEXT,
    gender TEXT,
    hair_description TEXT,
    face_description TEXT,
    accessories TEXT,
    body_shape TEXT,
    height TEXT,
    additional_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_asset_characters_organization_id
    ON public.digital_asset_characters(organization_id);

ALTER TABLE public.digital_asset_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org digital asset characters"
    ON public.digital_asset_characters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_characters.organization_id
        )
    );

CREATE POLICY "Users can insert own org digital asset characters"
    ON public.digital_asset_characters FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org digital asset characters"
    ON public.digital_asset_characters FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_characters.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org digital asset characters"
    ON public.digital_asset_characters FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_characters.organization_id
        )
    );

CREATE TABLE IF NOT EXISTS public.digital_asset_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_asset_objects_organization_id
    ON public.digital_asset_objects(organization_id);

ALTER TABLE public.digital_asset_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org digital asset objects"
    ON public.digital_asset_objects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_objects.organization_id
        )
    );

CREATE POLICY "Users can insert own org digital asset objects"
    ON public.digital_asset_objects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can update own org digital asset objects"
    ON public.digital_asset_objects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_objects.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = organization_id
        )
    );

CREATE POLICY "Users can delete own org digital asset objects"
    ON public.digital_asset_objects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
              AND p.active_organization_id = digital_asset_objects.organization_id
        )
    );

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_digital_asset_characters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_digital_asset_characters_updated_at ON public.digital_asset_characters;
CREATE TRIGGER trigger_digital_asset_characters_updated_at
    BEFORE UPDATE ON public.digital_asset_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_asset_characters_updated_at();

CREATE OR REPLACE FUNCTION update_digital_asset_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_digital_asset_objects_updated_at ON public.digital_asset_objects;
CREATE TRIGGER trigger_digital_asset_objects_updated_at
    BEFORE UPDATE ON public.digital_asset_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_asset_objects_updated_at();

COMMENT ON TABLE public.digital_asset_characters IS 'Digital asset characters (Karakter) per organization for Settings > Digital Assets.';
COMMENT ON TABLE public.digital_asset_objects IS 'Digital asset objects (Objek) per organization for Settings > Digital Assets.';
