import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { optimizedQueryKeys } from '@/features/10-management/hooks/useOptimizedQueryConfig';
import { useMemo } from 'react';
import type { SubscriptionStatus } from '@/features/10-management/hooks/useOptimizedSubscription';

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
 * OPTIMIZED: Now uses shared query from useOptimizedSubscription to eliminate duplicate RPC calls
 * This ensures React Query automatically deduplicates queries and shares cache
 */
export const useSubscriptionExpiry = () => {
  const { organizationId, loading: orgLoading } = useCurrentOrg();

  // Use shared query key to leverage React Query's automatic deduplication
  // This ensures we use the same cache as useOptimizedSubscription
  const queryKey = optimizedQueryKeys.subscription.status(organizationId || '');

  // Get subscription status from shared cache (same query as useOptimizedSubscription)
  // React Query will automatically deduplicate if useOptimizedSubscription is also used
  const { data: subscriptionStatus, isLoading, error } = useQuery<SubscriptionStatus | null>({
    queryKey,
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      // Use the same RPC call as useOptimizedSubscription for cache sharing
      const { data, error: rpcError } = await (supabase as any).rpc('get_subscription_status', {
        org_id: organizationId
      });

      if (rpcError) {
        console.warn('⚠️ RPC get_subscription_status failed in useSubscriptionExpiry:', rpcError);
        return null;
      }

      // Handle array response from RPC function
      const subscriptionData = Array.isArray(data) && data && data.length > 0 ? data[0] : data;
      
      if (!subscriptionData) {
        return null;
      }

      // Map to SubscriptionStatus format (same as useOptimizedSubscription)
      const rawData = subscriptionData as any;
      return {
        status: rawData.status || 'trial',
        plan_name: rawData.plan_name || 'Free Trial',
        is_trial: rawData.is_trial || (rawData.status === 'trial'),
        is_active: rawData.is_active || false,
        is_expired: rawData.is_expired || false,
        current_employees: rawData.employee_count || 0,
        member_count: rawData.member_limit || (rawData.is_trial ? 2 : 1000),
        over_limit: rawData.is_over_limit || false,
        days_until_expiry: rawData.days_remaining || 0,
        needs_renewal: (rawData.days_remaining || 0) <= 7,
        end_date: rawData.end_date,
        subscription_start_date: rawData.subscription_start_date,
        subscription_end_date: rawData.subscription_end_date,
        trial_end_date: rawData.trial_end_date,
        billing_cycle: rawData.billing_cycle || 'monthly',
        base_price_per_member: rawData.base_price_per_member || 0,
        next_payment_date: rawData.next_payment_date,
        employee_count: rawData.employee_count,
        member_limit: rawData.member_limit,
        is_over_limit: rawData.is_over_limit,
        days_remaining: rawData.days_remaining,
      } as SubscriptionStatus;
    },
    enabled: !orgLoading && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes - same as useOptimizedSubscription for cache consistency
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: false, // Don't retry on failure - use cached/default value
  });

  // Map SubscriptionStatus to SubscriptionExpiryStatus format
  const expiryStatus: SubscriptionExpiryStatus = useMemo(() => {
    // Default values when no subscription data
    if (!subscriptionStatus) {
      return {
        isExpired: false,
        isTrialExpired: false,
        isSubscriptionExpired: false,
        trialEndDate: null,
        subscriptionEndDate: null,
        expiredDate: null,
        daysExpired: 0,
        status: orgLoading ? 'checking' : 'active'
      };
    }

    // Calculate expiry status from subscription data
    const now = new Date();
    const trialEndDate = subscriptionStatus.trial_end_date ? new Date(subscriptionStatus.trial_end_date) : null;
    const subscriptionEndDate = subscriptionStatus.subscription_end_date ? new Date(subscriptionStatus.subscription_end_date) : null;

    // Check if trial expired
    const isTrialExpired = subscriptionStatus.is_trial && trialEndDate ? trialEndDate < now : false;

    // Check if subscription expired
    const isSubscriptionExpired = !subscriptionStatus.is_trial && subscriptionEndDate ? subscriptionEndDate < now : false;

    // Also check is_expired flag from RPC (more reliable)
    const isExpired = subscriptionStatus.is_expired || isTrialExpired || isSubscriptionExpired;
    
    const expiredDate = isTrialExpired ? subscriptionStatus.trial_end_date : 
                        isSubscriptionExpired ? subscriptionStatus.subscription_end_date : null;

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
      trialEndDate: subscriptionStatus.trial_end_date || null,
      subscriptionEndDate: subscriptionStatus.subscription_end_date || null,
      expiredDate,
      daysExpired,
      status: isExpired ? 'expired' : 'active'
    };
  }, [subscriptionStatus, orgLoading]);

  return {
    expiryStatus,
    isLoading: isLoading || orgLoading,
    error
  };
};

