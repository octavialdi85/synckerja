import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

// Consolidated query key factory
const createQueryKeys = (orgId: string) => ({
  allSocialMediaData: ['social-media-data', orgId],
  contentPlans: ['social-media-plans', orgId],
  masterData: ['social-media-master', orgId],
});

// Single optimized hook for all social media data
export const useOptimizedSocialMediaData = () => {
  const { organizationId } = useCurrentOrg();
  
  // Generate stable query keys
  const queryKeys = useMemo(() => 
    organizationId ? createQueryKeys(organizationId) : null, 
    [organizationId]
  );

  // Fetch content plans with related data - ALWAYS call useQuery unconditionally
  const contentPlansQuery = useQuery({
    queryKey: ['social-media-plans', organizationId || 'no-org'],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('social_media_plans')
        .select(`
          id,
          organization_id,
          post_date,
          content_type_id,
          pic_id,
          service_id,
          sub_service_id,
          title,
          content_pillar_id,
          brief,
          status,
          revision_count,
          approved,
          completion_date,
          pic_production_id,
          pic_production_source,
          google_drive_link,
          production_status,
          production_revision_count,
          production_completion_date,
          production_approved,
          production_approved_date,
          post_link,
          post_link_created_by,
          done,
          actual_post_date,
          on_time_status,
          status_content,
          created_at,
          updated_at,
          content_type:content_types(id, name),
          service:services(id, name),
          sub_service:sub_services(id, name),
          content_pillar:content_pillars(id, name, color),
          pic:employees!social_media_plans_pic_id_fkey(id, full_name),
          pic_production:employees!social_media_plans_pic_production_id_fkey(id, full_name),
          post_link_creator:employees!social_media_plans_post_link_created_by_fkey(id, full_name)
        `)
        .eq('organization_id', organizationId)
        .order('post_date', { ascending: false, nullsFirst: true })
        .order('created_at', { ascending: false })
        .limit(500); // Limit results for better performance

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 seconds - data is fresh for 30s, reduces flicker on initial load
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cached data for 5 minutes
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows (realtime handles updates)
    refetchOnMount: false, // Don't refetch on mount if data is fresh (reduces flicker)
    refetchInterval: false, // No polling - rely on realtime updates and manual mutations
    retry: 1, // Reduced retry attempts
    retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retry
  });

  // Fetch all master data in parallel - ALWAYS call useQuery unconditionally
  const masterDataQuery = useQuery({
    queryKey: ['social-media-master', organizationId || 'no-org'],
    queryFn: async () => {
      // Always fetch default data (organization_id IS NULL) even if no organizationId
      // This ensures default content types are always available
      

      // Execute all queries in parallel with optimized selects
      const [contentTypesResult, servicesResult, subServicesResult, contentPillarsResult] = await Promise.all([
        // Content Types - always include default (organization_id IS NULL)
        supabase
          .from('content_types')
          .select('id, name, is_active, organization_id')
          .or(organizationId ? `organization_id.eq.${organizationId},organization_id.is.null` : 'organization_id.is.null')
          .eq('is_active', true)
          .order('name')
          .limit(100),
        // Services - only organization-specific (no defaults exist in database)
        organizationId ? supabase
          .from('services')
          .select('id, name, is_active, organization_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name')
          .limit(100) : Promise.resolve({ data: [], error: null }),
        // Sub Services - only organization-specific (no defaults exist in database)
        organizationId ? supabase
          .from('sub_services')
          .select('id, name, service_id, is_active, organization_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name')
          .limit(200) : Promise.resolve({ data: [], error: null }),
        // Content Pillars - include both default and organization-specific
        supabase
          .from('content_pillars')
          .select('id, name, is_active, organization_id, is_default')
          .or(organizationId ? `is_default.eq.true,organization_id.eq.${organizationId}` : 'is_default.eq.true')
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('name')
          .limit(50)
      ]);

      // Check for errors
      if (contentTypesResult.error) throw contentTypesResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (subServicesResult.error) throw subServicesResult.error;
      if (contentPillarsResult.error) throw contentPillarsResult.error;

      const result = {
        contentTypes: contentTypesResult.data || [],
        services: servicesResult.data || [],
        subServices: subServicesResult.data || [],
        contentPillars: contentPillarsResult.data || []
      };
      console.log('✅ Master data loaded:', {
        organizationId,
        contentTypes: result.contentTypes.length,
        services: result.services.length,
        subServices: result.subServices.length,
        contentPillars: result.contentPillars.length
      });
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - master data rarely changes, cache for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep cached master data for 10 minutes
    refetchOnWindowFocus: false, // Master data rarely changes, don't refetch on focus
    refetchOnMount: false, // Don't refetch on mount if data is fresh (reduces flicker)
    refetchInterval: false, // No polling - master data rarely changes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Combine loading states efficiently
  // Use isPending for initial load (smooth loading), isFetching for background updates
  const isPending = contentPlansQuery.isPending || masterDataQuery.isPending;
  const isFetching = contentPlansQuery.isFetching || masterDataQuery.isFetching;
  
  // More strict loading check - only show loading if BOTH queries are pending AND no data exists
  // This prevents flicker when one query completes but the other is still loading
  const hasContentPlans = contentPlansQuery.data && contentPlansQuery.data.length > 0;
  const hasMasterData = masterDataQuery.data && 
    (masterDataQuery.data.contentTypes?.length > 0 || 
     masterDataQuery.data.services?.length > 0 || 
     masterDataQuery.data.contentPillars?.length > 0);
  
  // Both queries have settled (success or error) -> stop showing loading immediately
  const bothSettled = contentPlansQuery.status !== 'pending' && masterDataQuery.status !== 'pending';
  // Only show loading if we're truly in initial load state (pending and no data); stop as soon as both have settled
  const isLoading = !bothSettled && isPending && !hasContentPlans && !hasMasterData;
  const error = contentPlansQuery.error || masterDataQuery.error;

  // Return optimized data structure
  return {
    // Data
    contentPlans: contentPlansQuery.data || [],
    contentTypes: masterDataQuery.data?.contentTypes || [],
    services: masterDataQuery.data?.services || [],
    subServices: masterDataQuery.data?.subServices || [],
    contentPillars: masterDataQuery.data?.contentPillars || [],
    
    // States
    isLoading,
    isFetching, // Background updates
    error,
    organizationId,
    
    // Query invalidation helpers
    invalidateContentPlans: () => contentPlansQuery.refetch(),
    invalidateMasterData: () => masterDataQuery.refetch(),
  };
};