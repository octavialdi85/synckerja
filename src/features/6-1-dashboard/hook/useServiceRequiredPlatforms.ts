import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

export interface ServiceRequiredPlatform {
  id: string;
  service_id: string;
  platform: string;
  social_media_name_id: string | null;
  custom_platform_name: string | null;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  service?: {
    id: string;
    name: string;
  };
  social_media_name?: {
    id: string;
    name: string;
    platform: string;
  };
}

export interface CreateServiceRequiredPlatformData {
  service_id: string;
  platform: string;
  social_media_name_id?: string | null;
  custom_platform_name?: string | null;
  is_active?: boolean;
  organization_id: string;
}

export interface UpdateServiceRequiredPlatformData {
  platform?: string;
  social_media_name_id?: string | null;
  custom_platform_name?: string | null;
  is_active?: boolean;
}

const SERVICE_REQUIRED_PLATFORMS_QUERY_KEY = 'serviceRequiredPlatforms';

export const useServiceRequiredPlatforms = (serviceId?: string) => {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { isOwner, isAdmin } = useCentralizedUserData();

  // Check if user has permission to manage required platforms
  const canManage = isOwner || isAdmin;

  // Fetch required platforms for organization (optionally filtered by service)
  const { data: requiredPlatforms = [], isLoading, error } = useQuery({
    queryKey: [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId, serviceId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('service_required_platforms')
        .select(`
          *,
          service:services(id, name),
          social_media_name:social_media_names(id, name, platform)
        `)
        .eq('organization_id', organizationId)
        .order('platform', { ascending: true });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceRequiredPlatform[];
    },
    enabled: !!organizationId,
  });

  // Get required platforms by service
  const getRequiredPlatformsByService = (serviceId: string) => {
    return requiredPlatforms.filter(rp => 
      rp.service_id === serviceId && rp.is_active === true
    );
  };

  // Create new required platform
  const createRequiredPlatformMutation = useMutation({
    mutationFn: async (data: CreateServiceRequiredPlatformData) => {
      if (!canManage) {
        throw new Error('You do not have permission to manage required platforms');
      }

      const { data: result, error } = await supabase
        .from('service_required_platforms')
        .insert([{
          service_id: data.service_id,
          platform: data.platform,
          social_media_name_id: data.social_media_name_id || null,
          custom_platform_name: data.custom_platform_name || null,
          is_active: data.is_active ?? true,
          organization_id: data.organization_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select(`
          *,
          service:services(id, name),
          social_media_name:social_media_names(id, name, platform)
        `)
        .single();

      if (error) throw error;
      return result as ServiceRequiredPlatform;
    },
    onSuccess: (newPlatform) => {
      queryClient.setQueryData(
        [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId, newPlatform.service_id],
        (old: ServiceRequiredPlatform[] = []) => [...old, newPlatform]
      );
      queryClient.invalidateQueries({ 
        queryKey: [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId] 
      });
      toast.success('Required platform added successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create required platform:', error);
      toast.error(error.message || 'Failed to add required platform');
    },
  });

  // Update required platform
  const updateRequiredPlatformMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateServiceRequiredPlatformData }) => {
      if (!canManage) {
        throw new Error('You do not have permission to manage required platforms');
      }

      const { data, error } = await supabase
        .from('service_required_platforms')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          service:services(id, name),
          social_media_name:social_media_names(id, name, platform)
        `)
        .single();

      if (error) throw error;
      return data as ServiceRequiredPlatform;
    },
    onSuccess: (updatedPlatform) => {
      queryClient.setQueryData(
        [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId, updatedPlatform.service_id],
        (old: ServiceRequiredPlatform[] = []) =>
          old.map(platform => platform.id === updatedPlatform.id ? updatedPlatform : platform)
      );
      queryClient.invalidateQueries({ 
        queryKey: [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId] 
      });
      toast.success('Required platform updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update required platform:', error);
      toast.error(error.message || 'Failed to update required platform');
    },
  });

  // Delete required platform (soft delete by setting is_active = false)
  const deleteRequiredPlatformMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canManage) {
        throw new Error('You do not have permission to manage required platforms');
      }

      const { error } = await supabase
        .from('service_required_platforms')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      if (organizationId) {
        queryClient.setQueryData(
          [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId],
          (old: ServiceRequiredPlatform[] = []) =>
            old.map(platform => 
              platform.id === deletedId 
                ? { ...platform, is_active: false } 
                : platform
            )
        );
        queryClient.invalidateQueries({ 
          queryKey: [SERVICE_REQUIRED_PLATFORMS_QUERY_KEY, organizationId] 
        });
      }
      toast.success('Required platform deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete required platform:', error);
      toast.error(error.message || 'Failed to delete required platform');
    },
  });

  return {
    // Data
    requiredPlatforms,
    isLoading,
    error,
    getRequiredPlatformsByService,

    // Actions
    createRequiredPlatform: createRequiredPlatformMutation.mutate,
    updateRequiredPlatform: updateRequiredPlatformMutation.mutate,
    deleteRequiredPlatform: deleteRequiredPlatformMutation.mutate,

    // Loading states
    isCreating: createRequiredPlatformMutation.isPending,
    isUpdating: updateRequiredPlatformMutation.isPending,
    isDeleting: deleteRequiredPlatformMutation.isPending,

    // Permissions
    canManage,
  };
};

