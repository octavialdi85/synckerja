import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { devLog } from '@/config/logger';

export interface LinkComment {
  id: string;
  social_media_plan_id: string;
  comment_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  video_timestamp_seconds?: number | null;
  annotation_data?: Record<string, unknown> | null;
  commenter_display_name?: string | null;
  creator?: {
    full_name: string;
    email: string;
  };
}

export const useLinkCommentsQuery = (socialMediaPlanId: string, _linkUrl?: string) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const queryKey = useMemo(() =>
    ['link-comments', socialMediaPlanId],
    [socialMediaPlanId]
  );

  useEffect(() => {
    if (!socialMediaPlanId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`link_comments:${socialMediaPlanId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'link_comments',
          filter: `social_media_plan_id=eq.${socialMediaPlanId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [socialMediaPlanId, queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<LinkComment[]> => {
      if (!socialMediaPlanId) {
        return [];
      }

      const { data, error } = await supabase
        .from('link_comments')
        .select(`
          id,
          social_media_plan_id,
          comment_text,
          created_by,
          created_at,
          updated_at,
          video_timestamp_seconds,
          annotation_data,
          commenter_display_name
        `)
        .eq('social_media_plan_id', socialMediaPlanId)
        .order('created_at', { ascending: true });

      if (error) {
        devLog.error('Error fetching link comments:', error);
        throw error;
      }

      // Optional diagnostic: if no comments returned and RLS might hide rows, hint to check active_organization_id
      if ((data?.length ?? 0) === 0) {
        devLog.debug(
          'Link comments empty for plan. If others see comments here, check profiles.active_organization_id matches plan org.',
          { socialMediaPlanId }
        );
      }

      const displayNameFromRow = (c: { commenter_display_name?: string | null }) =>
        (c.commenter_display_name && c.commenter_display_name.trim()) || null;

      // Use commenter_display_name when set; else public = Anonim, internal = fetch profile
      const commentsWithCreators = await Promise.all(
        (data || []).map(async (comment) => {
          const fromRow = displayNameFromRow(comment);
          if (comment.created_by == null) {
            return {
              ...comment,
              creator: { full_name: fromRow ?? 'Anonim', email: '' }
            } as LinkComment;
          }
          if (fromRow) {
            return {
              ...comment,
              creator: { full_name: fromRow, email: '' }
            } as LinkComment;
          }
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', comment.created_by)
              .single();

            return {
              ...comment,
              creator: profileData ? { full_name: profileData.full_name || 'Team', email: profileData.email || '' } : { full_name: 'Team', email: '' }
            } as LinkComment;
          } catch (err) {
            return {
              ...comment,
              creator: { full_name: 'Team', email: '' }
            } as LinkComment;
          }
        })
      );

      return commentsWithCreators;
    },
    enabled: !!socialMediaPlanId,
    staleTime: 30 * 1000, // 30 seconds - reduced cache time for better real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows (especially when copying links)
    refetchOnMount: false, // Don't refetch on mount if data is fresh (reduces unnecessary requests)
    refetchOnReconnect: false, // Disabled: no auto refetch on reconnect (same as global app policy)
    retry: 1,
  });
};
