import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

export const useCancelScheduledChange = () => {
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeRequestId: string) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('🚫 Cancelling scheduled change:', changeRequestId);

      const { error } = await (supabase as any)
        .from('subscription_change_requests')
        .update({
          status: 'cancelled',
          notes: 'Cancelled by user'
        })
        .eq('id', changeRequestId)
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      if (error) {
        console.error('❌ Error cancelling scheduled change:', error);
        throw error;
      }

      return { message: t('subscription.plans.success.cancelled', 'Scheduled change cancelled successfully') };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Refresh pending changes
      queryClient.invalidateQueries({ queryKey: ['pending-subscription-changes', organizationId] });
    },
    onError: (error: any) => {
      console.error('❌ Error cancelling scheduled change:', error);
      toast.error(applyVariables(t('subscription.plans.error.cancelFailed', 'Failed to cancel change: {{message}}'), { message: error.message || 'Unknown error' }));
    },
  });
};