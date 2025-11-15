import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

interface SchedulePlanChangeParams {
  current_plan_id: string;
  target_plan_id: string;
  current_member_count: number;
  target_member_count: number;
  change_type: 'upgrade' | 'downgrade' | 'member_increase' | 'member_decrease' | 'mixed';
  scheduled_date: string; // ISO date
  prorate_amount?: number; // default 0
  charge_now?: boolean; // should be false for scheduled changes
}

export const useSchedulePlanChange = () => {
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();

  return useMutation({
    mutationFn: async (params: SchedulePlanChangeParams) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await (supabase as any).from('subscription_change_requests').insert({
        organization_id: organizationId,
        current_plan_id: params.current_plan_id,
        target_plan_id: params.target_plan_id,
        current_member_count: params.current_member_count,
        target_member_count: params.target_member_count,
        change_type: params.change_type,
        scheduled_date: params.scheduled_date,
        prorate_amount: params.prorate_amount ?? 0,
        charge_now: params.charge_now ?? false,
        requested_by: user.id,
        status: 'pending',
      });

      if (error) {
        console.error('❌ Failed to schedule plan change:', error);
        throw error;
      }

      return { message: t('subscription.plans.success.scheduled', 'Plan change scheduled for end of current period.') };
    },
    onSuccess: (res) => {
      toast.success(res.message);
      // Optionally refresh subscription queries
    },
    onError: (err: any) => {
      toast.error(applyVariables(t('subscription.plans.error.scheduleFailed', 'Failed to schedule plan change: {{message}}'), { message: err.message || 'Unknown error' }));
    }
  });
};
