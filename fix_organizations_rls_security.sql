-- ============================================
-- Migration: Fix RLS Security Issues - Organizations Table
-- Description: Perbaiki kebocoran data pada tabel organizations
-- Priority: CRITICAL
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Hapus Policy yang Bermasalah
-- ============================================
-- Policy ini mengizinkan anonymous users melihat data organization
-- Ini adalah KEBOCORAN DATA yang serius untuk aplikasi multi-tenant
DROP POLICY IF EXISTS "Public can view organizations for job preview" 
ON public.organizations;

-- ============================================
-- STEP 2: Buat Policy Baru yang Lebih Aman
-- ============================================
-- Hanya authenticated users yang bisa melihat organization untuk job preview
-- Ini masih memungkinkan job preview berfungsi, tapi lebih aman
CREATE POLICY "Authenticated users can view organizations for job preview"
ON public.organizations
FOR SELECT
TO authenticated  -- Hanya authenticated users, BUKAN anonymous
USING (
    EXISTS (
        SELECT 1 
        FROM job_openings jo
        JOIN recruitment_links rl ON rl.job_opening_id = jo.id
        WHERE jo.organization_id = organizations.id 
        AND rl.status = 'active' 
        AND jo.status = 'active'
    )
);

-- ============================================
-- STEP 3: Hapus Policy Duplikat
-- ============================================
-- Policy "Users can view owned or joined organizations" adalah duplikat
-- dari "Users can view organizations they are members of"
-- Hapus yang duplikat untuk menghindari confusion
DROP POLICY IF EXISTS "Users can view owned or joined organizations" 
ON public.organizations;

-- ============================================
-- STEP 4: Verifikasi Policies
-- ============================================
-- Pastikan semua policies sudah benar
DO $$
DECLARE
    policy_count INTEGER;
    anon_policy_count INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'organizations' 
    AND schemaname = 'public';
    
    -- Count policies dengan role 'anon'
    SELECT COUNT(*) INTO anon_policy_count
    FROM pg_policies
    WHERE tablename = 'organizations' 
    AND schemaname = 'public'
    AND 'anon' = ANY(roles::text[]);
    
    -- Verifikasi
    IF anon_policy_count > 0 THEN
        RAISE EXCEPTION 'Masih ada % policy(ies) yang mengizinkan anonymous access!', anon_policy_count;
    END IF;
    
    IF policy_count < 5 THEN
        RAISE WARNING 'Total policies: %. Pastikan semua policies penting masih ada.', policy_count;
    END IF;
    
    RAISE NOTICE 'Verifikasi selesai. Total policies: %, Anonymous policies: %', policy_count, anon_policy_count;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (Jalankan setelah migration)
-- ============================================

-- Test 1: Pastikan anonymous user TIDAK bisa melihat data
-- Query ini harus return 0 rows (jika dijalankan sebagai anon)
-- SELECT COUNT(*) FROM organizations;

-- Test 2: Authenticated user harus bisa melihat organization mereka sendiri
-- SELECT COUNT(*) FROM organizations WHERE user_id = auth.uid();

-- Test 3: Authenticated user harus bisa melihat organization dimana mereka member
-- SELECT COUNT(*) 
-- FROM organizations o
-- WHERE o.id IN (
--     SELECT organization_id 
--     FROM user_organizations 
--     WHERE user_id = auth.uid() AND is_active = true
-- );

-- Test 4: Authenticated user harus bisa melihat organization dengan job opening aktif
-- (jika memang ada job opening active dengan recruitment link active)
-- SELECT COUNT(*) 
-- FROM organizations o
-- WHERE EXISTS (
--     SELECT 1 
--     FROM job_openings jo
--     JOIN recruitment_links rl ON rl.job_opening_id = jo.id
--     WHERE jo.organization_id = o.id 
--     AND rl.status = 'active' 
--     AND jo.status = 'active'
-- );

-- ============================================
-- ROLLBACK (Jika diperlukan)
-- ============================================
-- BEGIN;
-- DROP POLICY IF EXISTS "Authenticated users can view organizations for job preview" ON public.organizations;
-- CREATE POLICY "Public can view organizations for job preview"
-- ON public.organizations
-- FOR SELECT
-- TO anon, authenticated
-- USING (
--     EXISTS (
--         SELECT 1 
--         FROM job_openings jo
--         JOIN recruitment_links rl ON rl.job_opening_id = jo.id
--         WHERE jo.organization_id = organizations.id 
--         AND rl.status = 'active' 
--         AND jo.status = 'active'
--     )
-- );
-- CREATE POLICY "Users can view owned or joined organizations"
-- ON public.organizations
-- FOR SELECT
-- TO public
-- USING (
--     (user_id = auth.uid()) OR 
--     (id IN (
--         SELECT user_organizations.organization_id
--         FROM user_organizations
--         WHERE user_organizations.user_id = auth.uid() 
--         AND user_organizations.is_active = true
--     ))
-- );
-- COMMIT;


























