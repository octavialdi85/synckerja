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

      // Get subscription data from organization_subscriptions table
      const { data: subscription, error: subError } = await supabase
        .from('organization_subscriptions')
        .select('trial_end_date, subscription_end_date, is_trial, status')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (subError) {
        console.error('Error checking subscription expiry:', subError);
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

      const now = new Date();
      let isExpired = false;
      let isTrialExpired = false;
      let isSubscriptionExpired = false;
      let expiredDate: string | null = null;
      let daysExpired = 0;

      // PRIORITY LOGIC:
      // 1. If subscription_end_date exists (even if is_trial = true), check subscription expiry first
      //    This handles cases where user upgraded from trial to subscription
      // 2. If no subscription_end_date but trial_end_date exists and is_trial = true, check trial expiry
      // 3. If both exist, subscription_end_date takes priority

      // Check subscription expiry first (if subscription_end_date exists)
      if (subData.subscription_end_date) {
        const subscriptionEnd = new Date(subData.subscription_end_date);
        if (now > subscriptionEnd) {
          isSubscriptionExpired = true;
          isExpired = true;
          expiredDate = subData.subscription_end_date;
          daysExpired = Math.floor((now.getTime() - subscriptionEnd.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Check trial expiry only if:
      // - subscription_end_date doesn't exist OR subscription already expired
      // - is_trial = true
      // - trial_end_date exists
      if ((!subData.subscription_end_date || isSubscriptionExpired) && subData.is_trial && subData.trial_end_date) {
        const trialEnd = new Date(subData.trial_end_date);
        if (now > trialEnd) {
          isTrialExpired = true;
          // Only set expired if subscription_end_date doesn't exist
          // If subscription_end_date exists but expired, we already set isExpired above
          if (!subData.subscription_end_date) {
            isExpired = true;
            expiredDate = subData.trial_end_date;
            daysExpired = Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
      }

      return {
        isExpired,
        isTrialExpired,
        isSubscriptionExpired,
        trialEndDate: subData.trial_end_date,
        subscriptionEndDate: subData.subscription_end_date,
        expiredDate,
        daysExpired: Math.max(0, daysExpired),
        status: isExpired ? 'expired' : 'active'
      };
    },
    enabled: !!organizationId,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
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

