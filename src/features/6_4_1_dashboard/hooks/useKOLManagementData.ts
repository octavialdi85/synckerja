import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useKOLRatings } from '@/hooks/organized/utils';
import { useMemo } from 'react';

export interface KOLProfileWithStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  category: string;
  status: string;
  followers_count: number;
  engagement_rate: number;
  profile_photo_url: string;
  active_campaigns: number;
  total_reach: number;
  social_accounts: Array<{
    platform: string;
    followers: number;
    engagement_rate: number;
  }>;
}

export interface KOLFilters {
  search: string;
  category: string;
  platform: string;
  status: string;
  performance: string;
}

export const useKOLManagementData = (filters: KOLFilters) => {
  const { organizationId } = useCurrentOrg();
  // Only fetch ratings if needed (lazy loading)
  const { ratings } = useKOLRatings();

  // Fetch KOL profiles with campaign data
  const { data: kolData, isLoading } = useQuery({
    queryKey: ['kol-management-data', organizationId],
    queryFn: async () => {
      if (!organizationId) return { profiles: [], campaigns: [], socialAccounts: [] };

      // Fetch KOL profiles (remove !inner to get profiles even without campaign assignments)
      // Handle kol_campaign_assignments gracefully if table/column doesn't exist
      let profiles: any[] = [];
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('kol_profiles')
          .select(`
            *,
            kol_campaign_assignments (
              campaign_id,
              kol_campaigns (
                id,
                status,
                name
              )
            )
          `)
          .eq('organization_id', organizationId);

        if (profilesError) {
          // Handle expected errors silently
          const isExpectedError = 
            profilesError.code === '42703' ||
            profilesError.message?.includes('column') && profilesError.message?.includes('does not exist') ||
            profilesError.message?.includes('relation') && profilesError.message?.includes('does not exist');
          
          if (isExpectedError) {
            // Try fetching without campaign assignments
            const { data: profilesWithoutAssignments, error: simpleError } = await supabase
              .from('kol_profiles')
              .select('*')
              .eq('organization_id', organizationId);
            
            if (!simpleError) {
              profiles = profilesWithoutAssignments || [];
            }
          } else {
            throw profilesError;
          }
        } else {
          profiles = profilesData || [];
        }
      } catch (err: any) {
        // Silently handle expected errors
        const isExpectedError = 
          err.code === '42703' ||
          err.message?.includes('column') && err.message?.includes('does not exist') ||
          err.message?.includes('relation') && err.message?.includes('does not exist');
        
        if (!isExpectedError) {
          throw err;
        }
      }

      // Fetch social media accounts - handle errors gracefully
      let socialAccounts: any[] = [];
      const profileIds = profiles.map(p => p.id).filter(Boolean);
      
      if (profileIds.length > 0) {
        try {
          const { data: socialData, error: socialError } = await supabase
            .from('kol_social_media_accounts')
            .select('*')
            .in('kol_profile_id', profileIds);

          if (socialError) {
            const isExpectedError = 
              socialError.code === 'PGRST116' ||
              socialError.code === '42P01' ||
              socialError.message?.includes('404') ||
              socialError.message?.includes('does not exist');
            
            if (!isExpectedError) {
              throw socialError;
            }
          } else {
            socialAccounts = socialData || [];
          }
        } catch (err: any) {
          // Silently handle expected errors
          const isExpectedError = 
            err.code === 'PGRST116' ||
            err.code === '42P01' ||
            err.message?.includes('does not exist');
          
          if (!isExpectedError && import.meta.env.DEV) {
            console.error('Error fetching social accounts:', err);
          }
        }
      }

      // Fetch campaigns - handle errors gracefully
      let campaigns: any[] = [];
      try {
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('kol_campaigns')
          .select('*')
          .eq('organization_id', organizationId);

        if (campaignsError) {
          const isExpectedError = 
            campaignsError.code === 'PGRST116' ||
            campaignsError.code === '42P01' ||
            campaignsError.message?.includes('404') ||
            campaignsError.message?.includes('does not exist');
          
          if (!isExpectedError) {
            throw campaignsError;
          }
        } else {
          campaigns = campaignsData || [];
        }
      } catch (err: any) {
        // Silently handle expected errors
        const isExpectedError = 
          err.code === 'PGRST116' ||
          err.code === '42P01' ||
          err.message?.includes('does not exist');
        
        if (!isExpectedError && import.meta.env.DEV) {
          console.error('Error fetching campaigns:', err);
        }
      }

      return {
        profiles: profiles || [],
        campaigns: campaigns || [],
        socialAccounts: socialAccounts || []
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  // Process and filter data
  const processedData = useMemo(() => {
    if (!kolData) return { filteredProfiles: [], metrics: null };

    const { profiles, campaigns, socialAccounts } = kolData;

    // Calculate KOL stats and combine with social media data
    const profilesWithStats: KOLProfileWithStats[] = profiles.map(profile => {
      const kolSocialAccounts = socialAccounts.filter(acc => acc.kol_profile_id === profile.id);
      const kolCampaigns = profile.kol_campaign_assignments?.length || 0;
      const activeCampaigns = profile.kol_campaign_assignments?.filter(
        (assignment: any) => assignment.kol_campaigns.status === 'active'
      ).length || 0;

      const totalFollowers = kolSocialAccounts.reduce((sum, acc) => sum + (acc.followers || 0), 0) || profile.followers_count || 0;
      const avgEngagement = kolSocialAccounts.length > 0 
        ? kolSocialAccounts.reduce((sum, acc) => sum + (acc.engagement_rate || 0), 0) / kolSocialAccounts.length
        : profile.engagement_rate || 0;

      return {
        ...profile,
        active_campaigns: activeCampaigns,
        total_reach: totalFollowers,
        social_accounts: kolSocialAccounts.map(acc => ({
          platform: acc.platform,
          followers: acc.followers,
          engagement_rate: acc.engagement_rate
        }))
      };
    });

    // Apply filters
    let filteredProfiles = profilesWithStats;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.name.toLowerCase().includes(searchLower) ||
        profile.email.toLowerCase().includes(searchLower) ||
        profile.category.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Platform filter
    if (filters.platform && filters.platform !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.social_accounts.some(acc => 
          acc.platform.toLowerCase() === filters.platform.toLowerCase()
        )
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Performance filter
    if (filters.performance && filters.performance !== 'all') {
      const performanceThreshold = {
        'high': 5,
        'medium': 2,
        'low': 0
      };
      
      const threshold = performanceThreshold[filters.performance as keyof typeof performanceThreshold];
      if (threshold !== undefined) {
        filteredProfiles = filteredProfiles.filter(profile => {
          const avgEngagement = profile.social_accounts.length > 0 
            ? profile.social_accounts.reduce((sum, acc) => sum + acc.engagement_rate, 0) / profile.social_accounts.length
            : profile.engagement_rate;
          
          if (filters.performance === 'high') return avgEngagement >= threshold;
          if (filters.performance === 'medium') return avgEngagement >= threshold && avgEngagement < 5;
          if (filters.performance === 'low') return avgEngagement < 2;
          return true;
        });
      }
    }

    // Calculate metrics
    const totalKOLs = profilesWithStats.length;
    const activeKOLs = profilesWithStats.filter(p => p.status === 'active').length;
    const totalFollowers = profilesWithStats.reduce((sum, p) => sum + p.total_reach, 0);
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    
    const avgEngagement = profilesWithStats.length > 0 
      ? profilesWithStats.reduce((sum, p) => {
          const engagement = p.social_accounts.length > 0 
            ? p.social_accounts.reduce((acc, sa) => acc + sa.engagement_rate, 0) / p.social_accounts.length
            : p.engagement_rate;
          return sum + engagement;
        }, 0) / profilesWithStats.length
      : 0;

    // Calculate ratings metrics
    const totalRatings = ratings?.length || 0;
    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + (rating.rating || 0), 0) / ratings.length
      : 0;

    const metrics = {
      totalKOLs,
      activeKOLs,
      totalFollowers,
      totalCampaigns,
      activeCampaigns,
      avgEngagement: Number(avgEngagement.toFixed(2)),
      totalRatings,
      avgRating: Number(avgRating.toFixed(2))
    };

    return {
      filteredProfiles,
      metrics
    };
  }, [kolData, filters, ratings]);

  return {
    ...processedData,
    isLoading,
    refetch: () => {
      // Will be handled by react-query
    }
  };
};
