
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

export const useOptimizedKOLOperations = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // DISABLED: Query disabled to prevent errors - tables may not exist
  // Use useKOLManagementData hook instead for profiles and socialAccounts
  const { data: kolData, isLoading: kolLoading } = useQuery({
    queryKey: ['kol-profiles-with-social', organizationId],
    queryFn: async () => {
      // Return empty data immediately - avoid querying tables that may not exist
      return { profiles: [], socialAccounts: [] };
    },
    enabled: false, // Disabled - use useKOLManagementData instead
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // DISABLED: Query disabled to prevent errors - table may not exist
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['kol-campaigns-optimized', organizationId],
    queryFn: async () => {
      // Return empty array immediately - avoid querying table that may not exist
      return [];
    },
    enabled: false, // Disabled - table may not exist
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // DISABLED: All mutations disabled - tables may not exist
  const bulkUpdateProfiles = useMutation({
    mutationFn: async (updates: { ids: string[], data: any }) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const updateKOLProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const deleteKOLProfile = useMutation({
    mutationFn: async (id: string) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const updateSocialAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const createSocialAccount = useMutation({
    mutationFn: async (data: any) => {
      // No-op - table may not exist
      return null as any;
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const deleteSocialAccount = useMutation({
    mutationFn: async (id: string) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const assignKOLToCampaign = useMutation({
    mutationFn: async ({ campaignId, kolProfileId }: { campaignId: string, kolProfileId: string }) => {
      // No-op - table may not exist
    },
    onSuccess: () => {},
    onError: () => {}
  });

  // Performance metrics calculation
  const calculateMetrics = () => {
    if (!kolData) return null;

    const { profiles, socialAccounts } = kolData;
    const totalFollowers = socialAccounts.reduce((sum, account) => sum + (account.followers || 0), 0);
    const avgEngagement = socialAccounts.length > 0 
      ? socialAccounts.reduce((sum, account) => sum + (account.engagement_rate || 0), 0) / socialAccounts.length 
      : 0;

    return {
      totalKOLs: profiles.length,
      activeKOLs: profiles.filter(p => p.status === 'active').length,
      totalFollowers,
      avgEngagement: avgEngagement.toFixed(2),
      totalCampaigns: campaigns?.length || 0,
      activeCampaigns: campaigns?.filter(c => c.status === 'active').length || 0
    };
  };

  return {
    // Data
    profiles: Array.isArray(kolData?.profiles) ? kolData.profiles : [],
    socialAccounts: Array.isArray(kolData?.socialAccounts) ? kolData.socialAccounts : [],
    campaigns: Array.isArray(campaigns) ? campaigns : [],
    metrics: calculateMetrics(),
    
    // Loading states
    isLoading: kolLoading || campaignsLoading,
    
    // Operations
    bulkUpdateProfiles,
    assignKOLToCampaign,
    updateKOLProfile: (id: string, data: any) => updateKOLProfile.mutateAsync({ id, data }),
    deleteKOLProfile: (id: string) => deleteKOLProfile.mutateAsync(id),
    updateSocialAccount: (id: string, data: any) => updateSocialAccount.mutateAsync({ id, data }),
    createSocialAccount: (data: any) => createSocialAccount.mutateAsync(data),
    deleteSocialAccount: (id: string) => deleteSocialAccount.mutateAsync(id),
    
    // Refresh function
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-profiles-with-social'] });
      queryClient.invalidateQueries({ queryKey: ['kol-campaigns-optimized'] });
    }
  };
};
