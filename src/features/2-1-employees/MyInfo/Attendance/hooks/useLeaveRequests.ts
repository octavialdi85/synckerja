
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface LeaveRequestData {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  emergency_contact: string;
  work_handover: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    email: string;
    employee_id: string;
    departments?: {
      name: string;
    };
  };
}

interface UseLeaveRequestsProps {
  month?: number;
  year?: number;
  status?: string;
}

export const useLeaveRequests = ({ month, year, status }: UseLeaveRequestsProps = {}) => {
  const { organizationId } = useCurrentOrg();
  
  return useQuery({
    queryKey: ['leave-requests', organizationId, month, year, status],
    queryFn: async () => {
      if (!organizationId) {
        console.log('⚠️ No organization ID found, returning empty array');
        return [];
      }

      console.log('🔍 Fetching leave requests with filters:', { organizationId, month, year, status });
      
      // First, let's check if we can connect to the table at all
      console.log('📊 Checking leave_requests table...');
      
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employees!inner (
            full_name,
            email,
            employee_id,
            organization_id,
            departments (
              name
            )
          )
        `)
        .eq('employees.organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Filter by organization first, then by month and year if provided
      if (month && year) {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        console.log('📅 Filtering by date range:', { startDate, endDate });
        query = query
          .gte('start_date', startDate)
          .lte('start_date', endDate);
      }

      // Filter by status if provided
      if (status && status !== 'all') {
        console.log('🏷️ Filtering by status:', status);
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching leave requests:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Leave requests fetched successfully!');
      console.log('📋 Data received:', data);
      console.log('📊 Total records:', data?.length || 0);
      
      // Log first record for debugging if available
      if (data && data.length > 0) {
        console.log('📝 Sample record:', data[0]);
      }

      return data as LeaveRequestData[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

