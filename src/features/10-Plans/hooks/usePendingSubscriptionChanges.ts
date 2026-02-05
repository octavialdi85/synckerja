import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface PendingSubscriptionChange {
  id: string;
  current_plan_id: string;
  target_plan_id: string;
  current_member_count: number;
  target_member_count: number;
  change_type: 'upgrade' | 'downgrade' | 'member_increase' | 'member_decrease' | 'mixed';
  scheduled_date: string;
  prorate_amount: number;
  charge_now: boolean;
  status: string;
  notes?: string;
  created_at: string;
  current_plan?: any;
  target_plan?: any;
}

export const usePendingSubscriptionChanges = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['pending-subscription-changes', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('subscription_change_requests')
        .select(`
          *
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (error) {
        throw error;
      }

      // If no pending changes, return empty array
      if (!data || data.length === 0) {
        return [];
      }

      // Fetch plan details separately for better performance
      const planIds = [...new Set([
        ...data.map((item: any) => item.current_plan_id),
        ...data.map((item: any) => item.target_plan_id)
      ])];

      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .in('id', planIds);

      if (plansError) {
        throw plansError;
      }

      // Map plan names to the change requests
      const enhancedData = data.map((item: any) => ({
        ...item,
        current_plan: plans?.find((p: any) => p.id === item.current_plan_id),
        target_plan: plans?.find((p: any) => p.id === item.target_plan_id)
      }));

      return (enhancedData || []) as PendingSubscriptionChange[];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache for pending changes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Disable focus refetch
  });
};