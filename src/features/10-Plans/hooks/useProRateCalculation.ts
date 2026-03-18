import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

interface ProRateRequest {
  new_member_count: number;
  target_plan_id?: string;
}

interface ProRateCalculation {
  success: boolean;
  current_plan: {
    id: string;
    name: string;
    member_count: number;
    base_price_per_member: number;
    billing_cycle: string;
    end_date: string;
  };
  target_plan: {
    id: string;
    name: string;
    base_price_per_member: number;
  };
  /** From latest successful payment; null when no payment history (new user). */
  last_paid_amount?: number | null;
  last_paid_member_count?: number | null;
  calculation: {
    new_member_count: number;
    member_difference: number;
    remaining_days: number;
    total_days: number;
    prorate_percentage: number;
    prorate_amount: number;
    plan_change_charge: number;
    member_change_charge: number;
    is_upgrade: boolean;
    is_plan_change: boolean;
    charge_now: boolean;
    change_type: string;
    scheduled_date: string;
    current_daily_rate?: number;
    target_daily_rate?: number;
  };
}

export const useProRateCalculation = () => {
  const { t } = useAppTranslation();
  
  return useMutation({
    mutationFn: async (request: ProRateRequest): Promise<ProRateCalculation> => {
      const { data, error } = await supabase.functions.invoke('calculate-prorate', {
        body: request,
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as ProRateCalculation;
    },
    onError: (error: any) => {
      toast.error(applyVariables(t('subscription.plans.error.proRateFailed', 'Failed to calculate prorate: {{message}}'), { message: error.message || 'Unknown error' }));
    },
  });
};