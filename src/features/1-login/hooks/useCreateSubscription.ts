import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrg } from './useCurrentOrg';
import { optimizedQueryKeys } from '@/features/10-management/hooks/useOptimizedQueryConfig';
import { clearHomeSubscriptionCache } from '@/components/HomeAccessGuard';

interface CreateSubscriptionRequest {
  plan_id?: string;
  plan_name?: string;
  member_count: number;
  billing_cycle: 'monthly' | 'yearly';
  is_free_forever?: boolean;
  subscription_plan_id?: string; // Allow backward compatibility
  member_limit?: number; // Allow backward compatibility
  is_trial?: boolean; // Allow backward compatibility
  [key: string]: any; // Allow other properties for backward compatibility
}

export const useCreateSubscription = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateSubscriptionRequest) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('🚀 Creating subscription...', request);

      const planId = request.plan_id || request.subscription_plan_id;
      const planName = request.plan_name || '';
      const isFreePlan = request.is_free_forever || planName.toLowerCase().includes('free');

      // Insert subscription into organization_subscriptions table
      // Get plan details to check for trial days
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('jumlah_hari_trial')
        .eq('id', planId)
        .single();

      const trialDays = planData?.jumlah_hari_trial;
      const hasTrialPeriod = trialDays && trialDays > 0;

      const subscriptionData = {
        organization_id: organizationId,
        subscription_plan_id: planId,
        status: 'active',
        member_count: request.member_count,
        billing_cycle: request.billing_cycle,
        is_trial: hasTrialPeriod || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Point 2: Set trial dates based on jumlah_hari_trial
        ...(hasTrialPeriod ? {
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
          subscription_start_date: null,
          subscription_end_date: null,
        } : (isFreePlan || planData?.jumlah_hari_trial === null) ? {
          // Point 2: For Free Forever plans (jumlah_hari_trial = NULL), set trial dates to NULL
          trial_start_date: null,
          trial_end_date: null,
          subscription_start_date: null,
          subscription_end_date: null,
        } : {
          trial_start_date: null,
          trial_end_date: null,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: request.billing_cycle === 'yearly' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      };

      const { data: subscription, error: subscriptionError } = await supabase
        .from('organization_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (subscriptionError) {
        console.error('❌ Subscription creation error:', subscriptionError);
        throw subscriptionError;
      }

      console.log('✅ Subscription created:', subscription);

      // Update organization to mark as having active subscription
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ 
          has_active_subscription: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (orgError) {
        console.error('❌ Organization update error:', orgError);
        throw orgError;
      }

      console.log('✅ Organization subscription status updated');

      return { subscription, message: isFreePlan ? 'Free Forever plan activated!' : 'Subscription created successfully!' };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      
      // OPTIMIZED: Use standardized query key for cache invalidation
      // This ensures both useOptimizedSubscription and useSubscriptionExpiry get updated
      if (organizationId) {
        queryClient.invalidateQueries({ 
          queryKey: optimizedQueryKeys.subscription.status(organizationId),
          refetchType: 'active' // Immediately refetch active queries
        });
      }
      
      // Clear home subscription cache so next visit to home refetches (allows access)
      clearHomeSubscriptionCache(organizationId);

      // Store subscription creation flag and redirect to employee welcome
      sessionStorage.setItem('subscriptionJustCreated', 'true');
      sessionStorage.setItem('planSelectionCompleted', 'true');
      
      // Small delay then redirect to employee welcome
      setTimeout(() => {
        window.location.href = '/employee-welcome';
      }, 1500);
    },
    onError: (error: any) => {
      console.error('❌ Subscription creation error:', error);
      toast.error('Gagal membuat subscription: ' + (error.message || 'Unknown error'));
    },
  });
};