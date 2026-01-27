
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

export type KOLCampaign = {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  objectives?: string;
  target_reach?: number;
  target_engagement?: number;
  target_conversion?: number;
  total_budget?: number;
  allocated_budget?: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator_name?: string;
};

export const useKOLCampaigns = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ['kol-campaigns', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      // First fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('kol_campaigns')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        throw campaignsError;
      }
      
      if (!campaignsData || campaignsData.length === 0) {
        return [];
      }

      // Get unique user IDs from created_by field
      const userIds = [...new Set(campaignsData
        .map(campaign => campaign.created_by)
        .filter(Boolean))] as string[];

      // Fetch profiles for these user IDs
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profilesError) {
          if (import.meta.env.DEV) {
            console.error('Error fetching profiles:', profilesError);
          }
        } else {
          profiles = profilesData || [];
        }
      }

      // Map campaigns with creator names
      const transformedData = campaignsData.map(campaign => ({
        ...campaign,
        creator_name: (profiles && Array.isArray(profiles)) ? profiles.find(profile => profile.user_id === campaign.created_by)?.full_name || 'Unknown User' : 'Unknown User'
      }));
      
      return transformedData as KOLCampaign[];
    },
    enabled: !!currentOrg?.id,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaignData: Omit<KOLCampaign, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'creator_name'>) => {
      if (!currentOrg?.id) {
        throw new Error('No organization selected. Please ensure you are logged in and have an active organization.');
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated. Please log in to create campaigns.');
      }

      if (import.meta.env.DEV) {
        console.log('Creating campaign with data:', campaignData);
        console.log('Current organization:', currentOrg.id);
        console.log('Current user:', user.id);
      }

      // Validate required fields
      if (!campaignData.name?.trim()) {
        throw new Error('Campaign name is required');
      }

      const insertData = {
        ...campaignData,
        organization_id: currentOrg.id,
        created_by: user.id, // Set the created_by field with current user ID
      };

      if (import.meta.env.DEV) {
        console.log('Inserting campaign data:', insertData);
      }

      const { data, error } = await supabase
        .from('kol_campaigns')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Supabase error:', error);
        }
        
        // Provide more specific error messages
        if (error.code === '42501') {
          throw new Error('Access denied. Please check your organization membership and permissions.');
        } else if (error.code === '23505') {
          throw new Error('A campaign with this name already exists in your organization.');
        } else {
          throw new Error(`Failed to create campaign: ${error.message}`);
        }
      }

      if (import.meta.env.DEV) {
        console.log('Campaign created successfully:', data);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('Campaign creation error:', error);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KOLCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('kol_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kol_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
};
