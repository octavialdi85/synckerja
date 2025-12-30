import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export interface EmployeeForRemoval {
  id: string;
  full_name: string;
  email: string;
  pending_removal: boolean;
  pending_removal_reason?: string | null;
  pending_removal_date?: string | null;
  status?: string | null;
}

/**
 * Hook to fetch active employees that can be marked for removal
 */
export const useActiveEmployeesForRemoval = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['active-employees-for-removal', organizationId],
    queryFn: async (): Promise<EmployeeForRemoval[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, status, pending_removal, pending_removal_reason, pending_removal_date')
        .eq('organization_id', organizationId)
        .or('status.eq.active,status.is.null')
        .order('full_name');

      if (error) {
        console.error('❌ Error fetching active employees:', error);
        throw error;
      }

      return (data as EmployeeForRemoval[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to mark employees for removal
 */
export const useMarkEmployeesForRemoval = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();

  return useMutation({
    mutationFn: async ({
      employeeIds,
      reason = 'Subscription downgrade',
    }: {
      employeeIds: string[];
      reason?: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('🔍 useMarkEmployeesForRemoval - Starting mutation:', {
        employeeIds,
        organizationId,
        reason
      });

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use Edge Function to bypass RLS and ensure proper permissions
      const functionUrl = `${SUPABASE_URL}/functions/v1/mark-employees-removal`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          employeeIds,
          reason,
          organizationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Edge Function error:', errorData);
        throw new Error(errorData.message || `Failed to mark employees for removal (${response.status})`);
      }

      const result = await response.json();
      console.log('✅ Successfully marked employees for removal:', result);
      
      return { success: true, count: employeeIds.length, updated: result.updated || [] };
    },
    onSuccess: (result) => {
      console.log('✅ Mutation onSuccess called:', result);
      queryClient.invalidateQueries({ queryKey: ['active-employees-for-removal'] });
      queryClient.invalidateQueries({ queryKey: ['employee-count'] }); // Also invalidate employee count
      toast.success(t('subscription.employeeRemoval.markedSuccess', 'Employees marked for removal'));
    },
    onError: (error: any) => {
      console.error('❌ Mutation onError called:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        statusCode: error.statusCode,
        status: error.status
      });
      
      // Provide more specific error messages
      let errorMessage = t('subscription.employeeRemoval.markedError', 'Failed to mark employees for removal');
      if (error.message?.includes('permission') || error.message?.includes('policy') || error.code === '42501') {
        errorMessage = t('subscription.employeeRemoval.permissionError', 'Permission denied. You need owner, admin, or HR role to manage employee removal.');
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      toast.error(errorMessage);
      console.error('❌ Failed to mark employees:', error);
    },
  });
};

/**
 * Hook to unmark employees from removal
 */
export const useUnmarkEmployeesForRemoval = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();

  return useMutation({
    mutationFn: async ({ employeeIds }: { employeeIds: string[] }) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('🔍 useUnmarkEmployeesForRemoval - Starting mutation:', {
        employeeIds,
        organizationId
      });

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use Edge Function to bypass RLS and ensure proper permissions
      const functionUrl = `${SUPABASE_URL}/functions/v1/unmark-employees-removal`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          employeeIds,
          organizationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Edge Function error:', errorData);
        throw new Error(errorData.message || `Failed to unmark employees from removal (${response.status})`);
      }

      const result = await response.json();
      console.log('✅ Successfully unmarked employees from removal:', result);

      return { success: true, count: employeeIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-employees-for-removal'] });
      toast.success(t('subscription.employeeRemoval.unmarkedSuccess', 'Employees unmarked from removal'));
    },
    onError: (error: any) => {
      toast.error(t('subscription.employeeRemoval.unmarkedError', 'Failed to unmark employees'));
      console.error('❌ Failed to unmark employees:', error);
    },
  });
};

/**
 * Hook to clear all pending removals for an organization
 */
export const useClearAllPendingRemovals = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('employees')
        .update({
          pending_removal: false,
          pending_removal_reason: null,
          pending_removal_date: null,
        })
        .eq('organization_id', organizationId)
        .eq('pending_removal', true);

      if (error) {
        console.error('❌ Error clearing pending removals:', error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-employees-for-removal'] });
      toast.success(t('subscription.employeeRemoval.clearedSuccess', 'All pending removals cleared'));
    },
    onError: (error: any) => {
      toast.error(t('subscription.employeeRemoval.clearedError', 'Failed to clear pending removals'));
      console.error('❌ Failed to clear pending removals:', error);
    },
  });
};


