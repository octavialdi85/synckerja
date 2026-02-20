-- Enable RLS on public.asset_assignments (exposed to PostgREST)
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access rows for their active organization
CREATE POLICY "Users can view asset assignments from their organization"
    ON public.asset_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = asset_assignments.organization_id
        )
    );

CREATE POLICY "Users can insert asset assignments for their organization"
    ON public.asset_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = asset_assignments.organization_id
        )
    );

CREATE POLICY "Users can update asset assignments from their organization"
    ON public.asset_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = asset_assignments.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = asset_assignments.organization_id
        )
    );

CREATE POLICY "Users can delete asset assignments from their organization"
    ON public.asset_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.active_organization_id = asset_assignments.organization_id
        )
    );
