
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SocialMediaLink, CreateSocialMediaLinkData, UpdateSocialMediaLinkData } from '@/types/social-media-links';

const SOCIAL_MEDIA_LINKS_QUERY_KEY = 'socialMediaLinks';

export const useSocialMediaLinks = (planId?: string) => {
  const queryClient = useQueryClient();

  // Fetch social media links for a specific plan
  const { data: links = [], isLoading, error } = useQuery({
    queryKey: [SOCIAL_MEDIA_LINKS_QUERY_KEY, planId],
    queryFn: async () => {
      if (!planId) return [];
      
      const { data, error } = await supabase
        .from('social_media_links')
        .select('*')
        .eq('social_media_plan_id', planId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SocialMediaLink[];
    },
    enabled: !!planId,
  });

  // Helper function to calculate on-time status
  const calculateOnTimeStatus = (actualPostDate: string | null, postDate: string) => {
    if (!actualPostDate || !postDate) return '';
    const actual = new Date(actualPostDate);
    const planned = new Date(postDate);
    if (actual <= planned) {
      return 'Ontime';
    } else {
      const diffTime = Math.abs(actual.getTime() - planned.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Late ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    }
  };

  // Helper function to update actual post date and on-time status
  const updateActualPostDate = async (socialMediaPlanId: string) => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get the plan's post_date to calculate on-time status
    const { data: planData, error: planError } = await supabase
      .from('social_media_plans')
      .select('post_date')
      .eq('id', socialMediaPlanId)
      .single();

    if (planError) {
      console.error('Failed to get plan data:', planError);
      return;
    }

    const onTimeStatus = calculateOnTimeStatus(currentDate, planData.post_date);

    const { error } = await supabase
      .from('social_media_plans')
      .update({ 
        actual_post_date: currentDate,
        on_time_status: onTimeStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', socialMediaPlanId);

    if (error) {
      console.error('Failed to update actual post date:', error);
    }
  };

  // Helper function to clear actual post date and on-time status
  const clearActualPostDate = async (socialMediaPlanId: string) => {
    const { error } = await supabase
      .from('social_media_plans')
      .update({ 
        actual_post_date: null,
        on_time_status: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', socialMediaPlanId);

    if (error) {
      console.error('Failed to clear actual post date:', error);
    }
  };

  // Create new social media link
  const createLinkMutation = useMutation({
    mutationFn: async (linkData: CreateSocialMediaLinkData) => {
      const { data, error } = await supabase
        .from('social_media_links')
        .insert([linkData])
        .select()
        .single();

      if (error) throw error;
      return data as SocialMediaLink;
    },
    onSuccess: async (newLink) => {
      queryClient.setQueryData(
        [SOCIAL_MEDIA_LINKS_QUERY_KEY, newLink.social_media_plan_id],
        (old: SocialMediaLink[] = []) => [...old, newLink]
      );
      
      // Update actual post date when first link is created
      await updateActualPostDate(newLink.social_media_plan_id);
      
      // Invalidate content plans to refresh the table
      queryClient.invalidateQueries({ queryKey: ['content-plans'] });
      
      toast.success('Social media link added successfully');
    },
    onError: (error) => {
      console.error('Failed to create social media link:', error);
      toast.error('Failed to add social media link');
    },
  });

  // Update social media link
  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSocialMediaLinkData }) => {
      const { data, error } = await supabase
        .from('social_media_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SocialMediaLink;
    },
    onSuccess: (updatedLink) => {
      queryClient.setQueryData(
        [SOCIAL_MEDIA_LINKS_QUERY_KEY, updatedLink.social_media_plan_id],
        (old: SocialMediaLink[] = []) =>
          old.map(link => link.id === updatedLink.id ? updatedLink : link)
      );
      toast.success('Social media link updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update social media link:', error);
      toast.error('Failed to update social media link');
    },
  });

  // Delete social media link
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('social_media_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: async (deletedId, variables) => {
      if (planId) {
        queryClient.setQueryData(
          [SOCIAL_MEDIA_LINKS_QUERY_KEY, planId],
          (old: SocialMediaLink[] = []) =>
            old.filter(link => link.id !== deletedId)
        );
        
        // Check if this was the last link, if so, clear actual post date and on-time status
        const remainingLinks = queryClient.getQueryData([SOCIAL_MEDIA_LINKS_QUERY_KEY, planId]) as SocialMediaLink[] || [];
        if (remainingLinks.length === 0) {
          await clearActualPostDate(planId);
        }
        
        // Invalidate content plans to refresh the table
        queryClient.invalidateQueries({ queryKey: ['content-plans'] });
      }
      toast.success('Social media link deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete social media link:', error);
      toast.error('Failed to delete social media link');
    },
  });

  // Batch create multiple links
  const createMultipleLinksMutation = useMutation({
    mutationFn: async (linksData: CreateSocialMediaLinkData[]) => {
      const { data, error } = await supabase
        .from('social_media_links')
        .insert(linksData)
        .select();

      if (error) throw error;
      return data as SocialMediaLink[];
    },
    onSuccess: async (newLinks) => {
      if (newLinks.length > 0 && planId) {
        queryClient.setQueryData(
          [SOCIAL_MEDIA_LINKS_QUERY_KEY, planId],
          (old: SocialMediaLink[] = []) => [...old, ...newLinks]
        );
        
        // Update actual post date when links are created
        await updateActualPostDate(newLinks[0].social_media_plan_id);
        
        // Invalidate content plans to refresh the table
        queryClient.invalidateQueries({ queryKey: ['content-plans'] });
      }
      toast.success(`${newLinks.length} social media links added successfully`);
    },
    onError: (error) => {
      console.error('Failed to create multiple social media links:', error);
      toast.error('Failed to add social media links');
    },
  });

  return {
    // Data
    links,
    isLoading,
    error,

    // Actions
    createLink: createLinkMutation.mutate,
    updateLink: updateLinkMutation.mutate,
    deleteLink: deleteLinkMutation.mutate,
    createMultipleLinks: createMultipleLinksMutation.mutate,

    // Loading states
    isCreating: createLinkMutation.isPending,
    isUpdating: updateLinkMutation.isPending,
    isDeleting: deleteLinkMutation.isPending,
    isCreatingMultiple: createMultipleLinksMutation.isPending,
  };
};

