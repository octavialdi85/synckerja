import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

export interface LeaveRequestInput {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  attachment_url?: string;
}

export const useLeaveRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLeaveRequest = useMutation({
    mutationFn: async (data: LeaveRequestInput) => {
      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request',
        variant: 'destructive',
      });
    },
  });

  return {
    createLeaveRequest: createLeaveRequest.mutate,
    isLoading: createLeaveRequest.isPending,
  };
};




