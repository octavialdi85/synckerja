
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
      
      // OPTIMIZED: Simplified query to prevent 502 Bad Gateway
      // Strategy: Remove nested joins, fetch employee data separately
      let query = supabase
        .from('leave_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit results to prevent huge datasets

      // Filter by month and year if provided
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

      // Add timeout protection (10 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Leave requests query timeout')), 10000)
      );

      let data: any = null;
      let error: any = null;

      try {
        const result = await Promise.race([query, timeoutPromise]) as any;
        data = result.data;
        error = result.error;
      } catch (timeoutError: any) {
        console.warn('⏰ Leave requests query timed out - returning empty array');
        return []; // Graceful degradation
      }

      if (error) {
        console.error('❌ Error fetching leave requests:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Graceful degradation - return empty array instead of throwing
        return [];
      }

      console.log('✅ Leave requests fetched successfully!');
      console.log('📋 Data received:', data);
      console.log('📊 Total records:', data?.length || 0);
      
      if (!data || data.length === 0) {
        return [];
      }

      // Fetch employee data separately (simpler query)
      const employeeIds = [...new Set(data.map((lr: any) => lr.employee_id).filter(Boolean))];
      
      let employeeMap: Record<string, any> = {};
      if (employeeIds.length > 0) {
        try {
          const { data: employees } = await supabase
            .from('employees')
            .select('id, full_name, email, employee_id, department_id, departments(name)')
            .in('id', employeeIds)
            .eq('organization_id', organizationId);
          
          if (employees) {
            employeeMap = employees.reduce((acc: any, emp: any) => {
              acc[emp.id] = emp;
              return acc;
            }, {});
          }
        } catch (empError) {
          console.warn('⚠️ Error fetching employee data, continuing without:', empError);
        }
      }

      // Map employee data to leave requests
      const enrichedData = data.map((lr: any) => ({
        ...lr,
        employees: employeeMap[lr.employee_id] || null
      }));

      console.log('✅ Leave requests enriched with employee data');
      
      return enrichedData as LeaveRequestData[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on failure - graceful degradation
  });
};

