import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { queryManager } from '@/utils/queryManager';

export interface SubscriptionExpiryStatus {
  isExpired: boolean;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  expiredDate: string | null;
  daysExpired: number;
  status: 'active' | 'expired' | 'checking';
}

/**
 * Hook to check if subscription or trial has expired
 * Checks both trial_end_date and subscription_end_date from organization_subscriptions table
 * Now with aggressive caching and query deduplication
 */
export const useSubscriptionExpiry = () => {
  const { organizationId, loading: orgLoading } = useCurrentOrg();

  const {
    data: expiryStatus,
    isLoading,
    error
  } = useQuery({
    queryKey: ['subscription-expiry', organizationId],
    queryFn: async (): Promise<SubscriptionExpiryStatus> => {
      if (!organizationId) {
        return {
          isExpired: false,
          isTrialExpired: false,
          isSubscriptionExpired: false,
          trialEndDate: null,
          subscriptionEndDate: null,
          expiredDate: null,
          daysExpired: 0,
          status: 'checking'
        };
      }

      // Use query manager to deduplicate and cache this query
      return queryManager.execute(
        `subscription-expiry-${organizationId}`,
        async () => {
          // OPTIMIZATION: Use RPC function instead of direct table query
          // The RPC function is already optimized and cached
          let subscription: any = null;
          
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_subscription_status', {
              org_id: organizationId  // Fixed: parameter name must match RPC function definition
            });

            if (!rpcError && rpcData && rpcData.length > 0) {
              // Use RPC data (already includes all needed fields)
              subscription = rpcData[0];
            }
          } catch (rpcErr) {
            console.warn('RPC get_subscription_status failed, using fallback', rpcErr);
          }

          // FALLBACK: If RPC failed, try direct query with timeout protection
          if (!subscription) {
            try {
              const { data: directData, error: subError } = await Promise.race([
                supabase
                  .from('organization_subscriptions')
                  .select('trial_end_date, subscription_end_date, is_trial, status, organization_id')
                  .eq('organization_id', organizationId)
                  .maybeSingle(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Query timeout')), 5000)
                )
              ]) as any;

              if (!subError && directData) {
                subscription = directData;
              }
            } catch (fallbackErr) {
              console.warn('Direct subscription query also failed', fallbackErr);
            }
          }

          // If both methods failed, return safe default
          if (!subscription) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ Could not fetch subscription for org:', organizationId, '- Using safe default');
            }
            // If error, don't block access - return safe default
            return {
              isExpired: false,
              isTrialExpired: false,
              isSubscriptionExpired: false,
              trialEndDate: null,
              subscriptionEndDate: null,
              expiredDate: null,
              daysExpired: 0,
              status: 'active' // Allow access if we can't determine status
            };
          }

          // Continue with normal expiry check logic...
          const now = new Date();
          const trialEndDate = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
          const subscriptionEndDate = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;

          // Check if trial expired
          const isTrialExpired = subscription.is_trial && trialEndDate ? trialEndDate < now : false;

          // Check if subscription expired
          const isSubscriptionExpired = !subscription.is_trial && subscriptionEndDate ? subscriptionEndDate < now : false;

          const isExpired = isTrialExpired || isSubscriptionExpired;
          const expiredDate = isTrialExpired ? subscription.trial_end_date : 
                            isSubscriptionExpired ? subscription.subscription_end_date : null;

          // Calculate days expired
          let daysExpired = 0;
          if (expiredDate) {
            const expDate = new Date(expiredDate);
            daysExpired = Math.floor((now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          return {
            isExpired,
            isTrialExpired,
            isSubscriptionExpired,
            trialEndDate: subscription.trial_end_date,
            subscriptionEndDate: subscription.subscription_end_date,
            expiredDate,
            daysExpired,
            status: isExpired ? 'expired' : 'active'
          };
        },
        {
          cacheTTL: 60000 // Cache for 60 seconds - subscription status doesn't change frequently
        }
      );
    },
    enabled: !orgLoading && !!organizationId,
    staleTime: 60000, // Consider data fresh for 60 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: false // Don't retry on failure - use cached/default value
  });

  return {
    expiryStatus: expiryStatus || {
      isExpired: false,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      trialEndDate: null,
      subscriptionEndDate: null,
      expiredDate: null,
      daysExpired: 0,
      status: orgLoading ? 'checking' as const : 'active' as const
    },
    isLoading: isLoading || orgLoading,
    error
  };
};

