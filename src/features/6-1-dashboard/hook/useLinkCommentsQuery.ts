
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface LinkComment {
  id: string;
  social_media_plan_id: string;
  link_url: string;
  comment_text: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string;
    email: string;
  };
}

export const useLinkCommentsQuery = (socialMediaPlanId: string, linkUrl: string) => {
  // Memoize query key to prevent unnecessary re-renders
  const effectiveLinkUrl = linkUrl || 'default-link';
  const queryKey = useMemo(() => 
    ['link-comments', socialMediaPlanId, effectiveLinkUrl], 
    [socialMediaPlanId, effectiveLinkUrl]
  );

  // Reduced logging for better performance

  return useQuery({
    queryKey,
    queryFn: async (): Promise<LinkComment[]> => {
      // Use default link if linkUrl is empty
      const effectiveLinkUrl = linkUrl || 'default-link';
      
      if (!socialMediaPlanId) {
        return [];
      }

      const { data, error } = await supabase
        .from('link_comments')
        .select(`
          id,
          social_media_plan_id,
          link_url,
          comment_text,
          created_by,
          created_at,
          updated_at
        `)
        .eq('social_media_plan_id', socialMediaPlanId)
        .eq('link_url', effectiveLinkUrl)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching link comments:', error);
        throw error;
      }

      // Reduced logging for better performance

      // Fetch creator information separately to avoid join issues
      const commentsWithCreators = await Promise.all(
        (data || []).map(async (comment) => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', comment.created_by)
              .single();

            return {
              ...comment,
              creator: profileData || undefined
            } as LinkComment;
          } catch (err) {
            // Silent fail for creator info
            return {
              ...comment,
              creator: undefined
            } as LinkComment;
          }
        })
      );

      return commentsWithCreators;
    },
    enabled: !!socialMediaPlanId,
    staleTime: 30 * 1000, // 30 seconds - reduced cache time for better real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnMount: true, // Enable refetch on mount
    refetchOnReconnect: true, // Enable refetch on reconnect
    retry: 1,
  });
};
