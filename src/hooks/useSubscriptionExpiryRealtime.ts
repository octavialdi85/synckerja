import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { optimizedQueryKeys } from '@/features/10-management/hooks/useOptimizedQueryConfig';
import { logger } from '@/config/logger';

/**
 * Hook to setup realtime subscription for organization_subscriptions table
 * Automatically invalidates subscription-expiry cache when subscription data changes
 * This ensures the expiry guard updates immediately when subscription is renewed
 * 
 * CRITICAL: This hook properly isolates realtime subscriptions per organization
 * - Cleans up previous organization's subscription when switching
 * - Prevents cross-organization data leaks
 * - Ensures only current organization's subscription is monitored
 */
export const useSubscriptionExpiryRealtime = () => {
  const queryClient = useQueryClient();
  const { organizationId, loading } = useCurrentOrg();
  const channelRef = useRef<any>(null);
  const previousOrgIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't setup subscription if organization is still loading
    if (loading) {
      return;
    }

    // CRITICAL: Cleanup previous subscription when organization changes
    if (previousOrgIdRef.current && previousOrgIdRef.current !== organizationId) {
      const oldChannelName = `subscription-expiry-realtime-${previousOrgIdRef.current}`;
      if (channelRef.current) {
        logger.realtime('🔌 Cleaning up realtime subscription for previous org:', previousOrgIdRef.current);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    if (!organizationId || organizationId === 'null' || organizationId === 'undefined') {
      previousOrgIdRef.current = null;
      return;
    }

    // Prevent duplicate subscriptions for same organization
    if (channelRef.current && previousOrgIdRef.current === organizationId) {
      return;
    }

    // Subscribe to changes in organization_subscriptions table
    // CRITICAL: Filter strictly by organization_id to prevent cross-organization data leaks
    const channelName = `subscription-expiry-realtime-${organizationId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_subscriptions',
          filter: `organization_id=eq.${organizationId}` // STRICT filter per organization
        },
        (payload) => {
          // Verify payload belongs to current organization
          const payloadOrgId = payload.new?.organization_id || payload.old?.organization_id;
          if (payloadOrgId !== organizationId) {
            console.warn('🚨 SECURITY: Received subscription update for different organization!', {
              currentOrg: organizationId,
              payloadOrg: payloadOrgId
            });
            return;
          }

          logger.realtime('📡 Subscription expiry data changed for org:', organizationId, payload.eventType);
          
          // OPTIMIZED: Invalidate using standardized query key (shared by useOptimizedSubscription and useSubscriptionExpiry)
          // Use refetchType: 'none' to let components decide when to refetch (lazy refetch)
          // This prevents cascade invalidations and reduces unnecessary network calls
          queryClient.invalidateQueries({ 
            queryKey: optimizedQueryKeys.subscription.status(organizationId), // Standardized query key
            refetchType: 'none' // Lazy refetch - components will refetch when needed
          }).then(() => {
            logger.realtime('✅ Subscription cache invalidated for org:', organizationId, '(lazy refetch)');
          }).catch((error) => {
            console.warn('⚠️ Error invalidating subscription cache:', error);
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.realtime('✅ Subscribed to subscription expiry realtime for org:', organizationId);
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const detail =
            err instanceof Error ? err.message : err != null ? String(err) : 'unknown';
          logger.realtime(
            '⚠️ Subscription expiry realtime unavailable (table may not be in Realtime publication or RLS). Org:',
            organizationId,
            'status:',
            status,
            'detail:',
            detail
          );
          if (channelRef.current) {
            try {
              supabase.removeChannel(channelRef.current);
            } catch {
              /* ignore */
            }
            channelRef.current = null;
          }
        }
      });

    channelRef.current = channel;
    previousOrgIdRef.current = organizationId;

    // Cleanup on unmount or organization change
    return () => {
      if (channelRef.current && previousOrgIdRef.current === organizationId) {
        logger.realtime('🔌 Unsubscribing from subscription expiry realtime for org:', organizationId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient, loading]); // Dependency on organizationId and loading ensures proper setup/cleanup
};

