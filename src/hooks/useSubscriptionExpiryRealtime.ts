import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

/**
 * Hook to setup realtime subscription for organization_subscriptions table
 * Automatically invalidates subscription-expiry cache when subscription data changes
 * This ensures the expiry guard updates immediately when subscription is renewed
 */
export const useSubscriptionExpiryRealtime = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!organizationId) return;

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      return;
    }

    // Subscribe to changes in organization_subscriptions table
    const channel = supabase
      .channel(`subscription-expiry-realtime-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_subscriptions',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Subscription expiry data changed:', payload.eventType);
          
          // Invalidate subscription expiry cache to force recheck
          queryClient.invalidateQueries({ 
            queryKey: ['subscription-expiry', organizationId],
            refetchType: 'active' // Immediately refetch active queries
          });
          
          console.log('✅ Subscription expiry cache invalidated');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to subscription expiry realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to subscription expiry realtime');
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from subscription expiry realtime');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);
};

