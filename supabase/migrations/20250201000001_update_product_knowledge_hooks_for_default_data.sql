-- Migration: Update product_knowledge_hooks to support default data (organization_id = NULL)
-- Description: Allow organization_id to be NULL for default hooks that can be used by all tenants
-- Created: 2025-02-01

-- Step 1: Drop existing foreign key constraint and make organization_id nullable
ALTER TABLE public.product_knowledge_hooks
    DROP CONSTRAINT IF EXISTS product_knowledge_hooks_organization_id_fkey;

-- Step 2: Make organization_id nullable
ALTER TABLE public.product_knowledge_hooks
    ALTER COLUMN organization_id DROP NOT NULL;

-- Step 3: Re-add foreign key constraint with ON DELETE CASCADE (only for non-null values)
ALTER TABLE public.product_knowledge_hooks
    ADD CONSTRAINT product_knowledge_hooks_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE;

-- Step 4: Drop existing RLS policies
DROP POLICY IF EXISTS "Organizations can view their product_knowledge_hooks" ON public.product_knowledge_hooks;
DROP POLICY IF EXISTS "Organizations can insert their product_knowledge_hooks" ON public.product_knowledge_hooks;
DROP POLICY IF EXISTS "Organizations can update their product_knowledge_hooks" ON public.product_knowledge_hooks;
DROP POLICY IF EXISTS "Organizations can delete their product_knowledge_hooks" ON public.product_knowledge_hooks;

-- Step 5: Create new RLS policies that allow access to default data (organization_id IS NULL)
-- Policy for SELECT: Allow viewing organization-specific hooks AND default hooks (organization_id IS NULL)
CREATE POLICY "Organizations can view their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR SELECT
    USING (
        -- Allow access to organization-specific hooks
        (
            EXISTS (
                SELECT 1 FROM public.employees
                WHERE employees.user_id = auth.uid()
                AND employees.organization_id = product_knowledge_hooks.organization_id
            )
        )
        OR
        -- Allow access to default hooks (organization_id IS NULL)
        (product_knowledge_hooks.organization_id IS NULL)
    );

-- Policy for INSERT: Only allow inserting organization-specific hooks (not default hooks)
CREATE POLICY "Organizations can insert their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR INSERT
    WITH CHECK (
        -- Only allow inserting organization-specific hooks (organization_id must match)
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
        AND product_knowledge_hooks.organization_id IS NOT NULL
    );

-- Policy for UPDATE: Allow updating organization-specific hooks only
CREATE POLICY "Organizations can update their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR UPDATE
    USING (
        -- Only allow updating organization-specific hooks
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
        AND product_knowledge_hooks.organization_id IS NOT NULL
    )
    WITH CHECK (
        -- Ensure updated data is still organization-specific
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
        AND product_knowledge_hooks.organization_id IS NOT NULL
    );

-- Policy for DELETE: Allow deleting organization-specific hooks only
CREATE POLICY "Organizations can delete their product_knowledge_hooks"
    ON public.product_knowledge_hooks FOR DELETE
    USING (
        -- Only allow deleting organization-specific hooks
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.organization_id = product_knowledge_hooks.organization_id
        )
        AND product_knowledge_hooks.organization_id IS NOT NULL
    );

-- Comments
COMMENT ON COLUMN public.product_knowledge_hooks.organization_id IS 
'Organization ID. NULL means this is a default hook available to all tenants.';

