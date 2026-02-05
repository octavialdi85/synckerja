
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';
import { optimizedQueryKeys } from '@/features/10-management/hooks/useOptimizedQueryConfig';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { logger } from '@/config/logger';

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';
  is_trial: boolean;
  is_active: boolean;
  is_expired: boolean;
  trial_end_date?: string;
  subscription_end_date?: string;
  subscription_start_date?: string;
  end_date?: string;
  plan_name: string;
  current_employees: number;
  employee_count?: number; // From DB
  member_count: number; // Maximum allowed employees for this plan
  member_limit?: number; // From DB
  over_limit: boolean;
  is_over_limit?: boolean; // From DB
  days_until_expiry: number;
  days_remaining?: number; // From DB
  needs_renewal: boolean;
  billing_cycle?: 'monthly' | 'yearly';
  base_price_per_member?: number;
  annual_discount_percentage?: number;
  next_payment_date?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  base_price_per_member: number;
  features: string[];
  is_active: boolean;
  is_custom: boolean;
  demo_required: boolean;
  annual_discount_percentage: number | null;
  member_discount_tiers: any[] | null;
  jumlah_hari_trial: number | null;
}

export const useOptimizedSubscription = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const hasInitializedRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // OPTIMIZED: Clear cache when organization becomes null to prevent data leak
  useEffect(() => {
    if (!organizationId) {
      // Clear subscription cache when org is null
      queryClient.removeQueries({
        queryKey: optimizedQueryKeys.subscription.status('')
      });
      lastOrgIdRef.current = null;
      hasInitializedRef.current = false;
      return;
    }
  }, [organizationId, queryClient]);

  // OPTIMIZED: Debounced organization change detection to prevent race conditions
  // This ensures we only invalidate once per organization change, even with rapid changes
  useEffect(() => {
    if (!organizationId) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Skip if already initialized for this org (prevents React strict mode double effect)
    if (hasInitializedRef.current && lastOrgIdRef.current === organizationId) {
      return;
    }

    // Debounce invalidation to prevent rapid-fire invalidations
    timeoutRef.current = setTimeout(() => {
      if (lastOrgIdRef.current !== organizationId) {
        const previousOrgId = lastOrgIdRef.current;
        lastOrgIdRef.current = organizationId;
        hasInitializedRef.current = true;

        if (previousOrgId) {
          queryClient.removeQueries({
            predicate: (query) => {
              const queryKey = query.queryKey;
              return Array.isArray(queryKey) && queryKey[0] === 'subscriptionStatus' && queryKey[1] === previousOrgId;
            }
          });
          queryClient.invalidateQueries({
            queryKey: optimizedQueryKeys.subscription.status(organizationId),
            refetchType: 'active'
          });
          logger.debug('✅ [useOptimizedSubscription] Subscription query invalidated and will refetch for org:', organizationId);
        }
        // On initial load (previousOrgId null): do NOT invalidate — useQuery already runs once; invalidating caused duplicate RPC/logs
      }
    }, 150);

    // Cleanup timeout on unmount or org change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  // Optimized subscription status query with proper caching and better error handling
  const {
    data: subscriptionStatus,
    isLoading: statusLoading,
    error: statusError
  } = useQuery({
    queryKey: optimizedQueryKeys.subscription.status(organizationId || ''),
    queryFn: async () => {
      logger.query('🔍 MAIN SUBSCRIPTION QUERY');
      logger.query('Organization ID:', organizationId);
      
      if (!organizationId) {
        throw new Error('No organization ID');
      }
      
      logger.query('📞 MAIN QUERY: Calling get_subscription_status RPC');
      
      const { data, error } = await (supabase as any).rpc('get_subscription_status', {
        org_id: organizationId
      });
      
      logger.query('📊 MAIN QUERY Raw Response:', { data, error });
      
      if (error) {
        throw error;
      }
      
      // Handle array response from RPC function
      const subscriptionData = Array.isArray(data) && data && data.length > 0 ? data[0] : data;
      logger.query('🔄 MAIN QUERY Processing:', subscriptionData);
      
      if (!subscriptionData) {
        logger.warn('⚠️ No subscription data returned from RPC');
        return null;
      }
      
      // Map the database response to our interface with proper field mapping
      const rawData = subscriptionData as any;
      
      const mappedData: SubscriptionStatus = {
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
        // Keep backward compatibility fields
        employee_count: rawData.employee_count,
        member_limit: rawData.member_limit,
        is_over_limit: rawData.is_over_limit,
        days_remaining: rawData.days_remaining,
      };
      
      logger.query('✅ MAIN QUERY Mapped data:', mappedData);
      return mappedData;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes - subscription doesn't change frequently, reduces unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes cache - keep longer for better performance
    refetchOnWindowFocus: false, // Disabled - use staleTime instead to reduce unnecessary refetches
    refetchOnMount: false, // Disabled - use staleTime instead, real-time updates will handle critical changes
    refetchOnReconnect: true, // Keep enabled for network recovery
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const {
    data: subscriptionPlans,
    isLoading: plansLoading
  } = useQuery({
    queryKey: optimizedQueryKeys.subscription.plans,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('base_price_per_member', { ascending: true });

      if (error) {
        throw error;
      }

      return data as SubscriptionPlan[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - plans don't change often
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    retry: 2,
  });

  // Optimized employee limit check mutation
  const checkEmployeeLimitMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      const { data, error } = await (supabase as any).rpc('can_add_employee', {
        org_id: organizationId
      });

      if (error) {
        throw error;
      }
      
      return data as boolean;
    },
    onError: () => {
      toast.error('Failed to check employee limit');
    },
    // Cache the result for 30 seconds to avoid repeated calls
    gcTime: 30 * 1000,
  });

  // Memoized canAddEmployee function
  const canAddEmployee = useCallback(async (): Promise<boolean> => {
    try {
      const result = await checkEmployeeLimitMutation.mutateAsync();
      return result;
    } catch {
      return false;
    }
  }, [checkEmployeeLimitMutation]);

  // Memoized refresh function - force refetch from Supabase
  const refreshSubscriptionStatus = useCallback(() => {
    if (organizationId) {
      logger.debug('🔄 [refreshSubscriptionStatus] Manually refreshing subscription for org:', organizationId);
      queryClient.invalidateQueries({ 
        queryKey: optimizedQueryKeys.subscription.status(organizationId),
        refetchType: 'active' // Immediately refetch active queries
      });
    }
  }, [organizationId, queryClient]);

  // Memoized derived state
  const derivedState = useMemo(() => ({
    isLoading: statusLoading || plansLoading,
    hasActiveSubscription: subscriptionStatus?.is_active || false,
    isTrialExpired: subscriptionStatus?.is_expired && subscriptionStatus?.is_trial,
    daysLeft: subscriptionStatus?.days_until_expiry || 0,
    isOverLimit: subscriptionStatus?.over_limit || false,
  }), [statusLoading, plansLoading, subscriptionStatus]);

  // Optimized logging - only log on initial load or errors (prevent spam)
  useEffect(() => {
    if (statusError) {
      // Error surfaced via query
    } else if (subscriptionStatus && !statusLoading) {
      // Only log once when data is first loaded
      const hasLogged = sessionStorage.getItem('subscription_loaded');
      if (!hasLogged) {
        logger.debug('✅ Subscription loaded:', subscriptionStatus.plan_name);
        sessionStorage.setItem('subscription_loaded', 'true');
      }
    }
  }, [subscriptionStatus, statusError, statusLoading]);

  return {
    subscriptionStatus,
    subscriptionPlans,
    statusLoading,
    plansLoading,
    statusError,
    canAddEmployee,
    refreshSubscriptionStatus,
    // Derived state for easier consumption
    ...derivedState,
  };
};

// Re-export for backward compatibility
export { useOptimizedSubscription as useSubscription };
