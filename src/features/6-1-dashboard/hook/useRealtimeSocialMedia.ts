import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export const useRealtimeSocialMedia = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!organizationId) return;

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      return;
    }

    // Enhanced realtime channel with immediate updates for ALL social media data
    const channel = supabase
      .channel(`social-media-enhanced-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_plans',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          // Smart cache update - invalidate only, let React Query handle refetch on next render
          if (organizationId) {
            queryClient.invalidateQueries({ 
              queryKey: ['social-media-plans', organizationId],
              refetchType: 'none' // Don't auto-refetch, let component decide when to fetch
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_links',
          filter: `social_media_plan_id=in.(select id from social_media_plans where organization_id='${organizationId}')`
        },
        (payload) => {
          console.log('📡 Social media links changed:', payload.eventType);
          
          // Smart cache update - invalidate only
          queryClient.invalidateQueries({ 
            queryKey: ['social-media-plans', organizationId],
            refetchType: 'none'
          });
          
          console.log('✅ Links cache invalidated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_access_configurations',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Approval configurations changed:', payload.eventType);
          
          // Invalidate approval configurations and related data
          queryClient.invalidateQueries({ 
            queryKey: ['approval-access-configurations', organizationId],
            refetchType: 'none'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['social-media-plans', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('📡 Employees changed:', payload.eventType);
          
          // Invalidate employee data and related social media data
          queryClient.invalidateQueries({ 
            queryKey: ['employees'],
            refetchType: 'none'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['social-media-plans', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_pillars',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Content pillars update:', payload.eventType);
          
          // Invalidate master data and pillar data
          queryClient.invalidateQueries({ 
            queryKey: ['social-media-master', organizationId],
            refetchType: 'none'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['contentPillarData', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_points',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Meeting points update:', payload.eventType);
          
          // Smart invalidation for meeting points
          queryClient.invalidateQueries({ 
            queryKey: ['meeting-points', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_point_updates',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Meeting point updates update:', payload.eventType);
          
          // Smart invalidation for meeting point updates
          queryClient.invalidateQueries({ 
            queryKey: ['meeting-point-updates', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motivations',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Motivations update:', payload.eventType);
          
          // Smart invalidation for motivations
          queryClient.invalidateQueries({ 
            queryKey: ['motivations', organizationId],
            refetchType: 'none'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motivation_likes',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          // Smart invalidation for motivations (since likes affect motivation data)
          queryClient.invalidateQueries({ 
            queryKey: ['motivations', organizationId],
            refetchType: 'none'
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection error - attempting to reconnect...');
          // Auto-reconnect logic
          setTimeout(() => {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          }, 2000);
        }
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

};
