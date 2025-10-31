import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

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
 */
export const useSubscriptionExpiry = () => {
  const { organizationId } = useCurrentOrg();

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

      // CRITICAL: Get subscription data from organization_subscriptions table
      // Include organization_id in select for verification to prevent cross-organization data leaks
      const { data: subscription, error: subError } = await supabase
        .from('organization_subscriptions')
        .select('trial_end_date, subscription_end_date, is_trial, status, organization_id')
        .eq('organization_id', organizationId) // STRICT filter per organization
        .maybeSingle();

      if (subError) {
        console.error('❌ Error checking subscription expiry for org:', organizationId, subError);
        // If error, don't block access - return safe default
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

      if (!subscription) {
        // No subscription found, allow access (might be new organization)
        console.log('ℹ️ No subscription found for org:', organizationId, '- Allowing access');
        return {
          isExpired: false,
          isTrialExpired: false,
          isSubscriptionExpired: false,
          trialEndDate: null,
          subscriptionEndDate: null,
          expiredDate: null,
          daysExpired: 0,
          status: 'active'
        };
      }

      // Type assertion for subscription data - use any to avoid type issues
      const subData = subscription as any;

      // CRITICAL: Verify the returned data belongs to requested organization
      // This is a security check to prevent cross-organization data leaks
      if (subData.organization_id !== organizationId) {
        console.error('🚨 SECURITY ERROR: Subscription data mismatch!', {
          requestedOrgId: organizationId,
          receivedOrgId: subData.organization_id,
          subscriptionData: subData
        });
        // Return safe default instead of throwing error (to prevent app crash)
        // But log error for security monitoring
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

      const now = new Date();
      let isExpired = false;
      let isTrialExpired = false;
      let isSubscriptionExpired = false;
      let expiredDate: string | null = null;
      let daysExpired = 0;

      // STRICT EXPIRY CHECK LOGIC:
      // 1. If subscription_end_date exists, check subscription expiry first (regardless of is_trial)
      //    This handles cases where user upgraded from trial to subscription
      // 2. If subscription_end_date doesn't exist or subscription expired, check trial_end_date
      // 3. Subscription_end_date takes priority when both exist
      // 4. Both dates are checked in UTC to avoid timezone issues
      // 5. IMPORTANT: Only check expiry based on DATE comparison, not on status field

      // Log raw data for debugging with organization context
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [Subscription Expiry] Raw subscription data from DB:', {
          organizationId,
          organization_id_from_db: subData.organization_id,
          is_trial: subData.is_trial,
          trial_end_date: subData.trial_end_date,
          subscription_end_date: subData.subscription_end_date,
          status: subData.status,
          verification: subData.organization_id === organizationId ? '✅ MATCH' : '❌ MISMATCH'
        });
      }

      // Normalize dates to UTC for accurate comparison
      // Use actual timestamp comparison (not just day-based) for precision
      const parseDate = (dateString: string | null): Date | null => {
        if (!dateString) return null;
        try {
          return new Date(dateString);
        } catch (e) {
          console.error('Error parsing date:', dateString, e);
          return null;
        }
      };

      // Use the 'now' variable already declared above (line 82)
      const nowTime = now.getTime();

      // Check subscription expiry first (if subscription_end_date exists)
      // This is the PRIMARY check for active subscriptions
      if (subData.subscription_end_date) {
        const subscriptionEnd = parseDate(subData.subscription_end_date);
        if (subscriptionEnd) {
          const subscriptionEndTime = subscriptionEnd.getTime();
          if (nowTime > subscriptionEndTime) {
            isSubscriptionExpired = true;
            isExpired = true;
            expiredDate = subData.subscription_end_date;
            daysExpired = Math.floor((nowTime - subscriptionEndTime) / (1000 * 60 * 60 * 24));
            console.warn('🔒 Subscription expired - subscription_end_date check:', {
              subscriptionEndDate: subData.subscription_end_date,
              subscriptionEndTime,
              nowTime,
              now: now.toISOString(),
              subscriptionEnd: subscriptionEnd.toISOString(),
              daysExpired
            });
          } else {
            console.log('✅ Subscription still active - subscription_end_date in future:', {
              subscriptionEndDate: subData.subscription_end_date,
              subscriptionEndTime,
              nowTime,
              daysRemaining: Math.floor((subscriptionEndTime - nowTime) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }

      // Check trial expiry only if:
      // - subscription_end_date doesn't exist OR subscription already expired
      // - is_trial = true (handle both boolean true and string 'true')
      // - trial_end_date exists
      // This is the SECONDARY check for trial subscriptions
      const isTrialActive = subData.is_trial === true || subData.is_trial === 'true' || (subData.status === 'trial' && subData.trial_end_date);
      
      if ((!subData.subscription_end_date || isSubscriptionExpired) && isTrialActive && subData.trial_end_date) {
        const trialEnd = parseDate(subData.trial_end_date);
        if (trialEnd) {
          const trialEndTime = trialEnd.getTime();
          if (nowTime > trialEndTime) {
            isTrialExpired = true;
            // Only set expired if subscription_end_date doesn't exist
            // If subscription_end_date exists but expired, we already set isExpired above
            if (!subData.subscription_end_date) {
              isExpired = true;
              expiredDate = subData.trial_end_date;
              daysExpired = Math.floor((nowTime - trialEndTime) / (1000 * 60 * 60 * 24));
              console.warn('🔒 Trial expired - trial_end_date check:', {
                trialEndDate: subData.trial_end_date,
                trialEndTime,
                nowTime,
                now: now.toISOString(),
                trialEnd: trialEnd.toISOString(),
                daysExpired
              });
            }
          } else {
            console.log('✅ Trial still active - trial_end_date in future:', {
              trialEndDate: subData.trial_end_date,
              trialEndTime,
              nowTime,
              daysRemaining: Math.floor((trialEndTime - nowTime) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }

      const result = {
        isExpired,
        isTrialExpired,
        isSubscriptionExpired,
        trialEndDate: subData.trial_end_date,
        subscriptionEndDate: subData.subscription_end_date,
        expiredDate,
        daysExpired: Math.max(0, daysExpired),
        status: isExpired ? 'expired' as const : 'active' as const
      };

      // Log expiry status for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [Subscription Expiry] Check Result for Organization:', {
          organizationId,
          isExpired: result.isExpired,
          isTrialExpired: result.isTrialExpired,
          isSubscriptionExpired: result.isSubscriptionExpired,
          trialEndDate: result.trialEndDate,
          subscriptionEndDate: result.subscriptionEndDate,
          expiredDate: result.expiredDate,
          daysExpired: result.daysExpired,
          status: result.status,
          isTrial: subData.is_trial,
          subscriptionStatus: subData.status,
          action: result.isExpired ? '🔒 ACCESS BLOCKED' : '✅ ACCESS ALLOWED'
        });
      }

      return result;
    },
    enabled: !!organizationId,
    refetchInterval: 60 * 1000, // Check every 1 minute for stricter expiry detection
    staleTime: 30 * 1000, // 30 seconds - shorter stale time for more accurate checks
    gcTime: 5 * 60 * 1000, // 5 minutes cache
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
      status: 'checking' as const
    },
    isLoading,
    error
  };
};

