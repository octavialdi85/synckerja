import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { logger } from '@/config/logger';

export const useEmployeeAttendanceStats = () => {
  const { currentOrg } = useCurrentOrg();

  return useQuery({
    queryKey: ['employee-attendance-stats', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) {
        throw new Error('No organization found');
      }

      logger.query('📊 Fetching employee attendance stats for org:', currentOrg.id);

      // Get current month start and end dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get attendance records for current month
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          employee_id,
          attendance_date,
          status,
          is_late,
          employees!inner (
            id,
            full_name,
            status
          )
        `)
        .eq('organization_id', currentOrg.id)
        .gte('attendance_date', startOfMonth.toISOString().split('T')[0])
        .lte('attendance_date', endOfMonth.toISOString().split('T')[0])
        .eq('employees.status', 'active');

      if (attendanceError) {
        console.error('❌ Error fetching attendance records:', attendanceError);
        throw attendanceError;
      }

      // Get leave requests for current month
      const { data: leaveRecords, error: leaveError } = await supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          start_date,
          end_date,
          total_days,
          status,
          employees!inner (
            id,
            full_name,
            status
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'approved')
        .gte('start_date', startOfMonth.toISOString().split('T')[0])
        .lte('end_date', endOfMonth.toISOString().split('T')[0])
        .eq('employees.status', 'active');

      if (leaveError) {
        console.error('❌ Error fetching leave records:', leaveError);
        throw leaveError;
      }

      // Get total active employees
      const { data: activeEmployees, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');

      if (employeeError) {
        console.error('❌ Error fetching active employees:', employeeError);
        throw employeeError;
      }

      // Calculate statistics
      const totalActiveEmployees = activeEmployees?.length || 0;
      const workingDays = getWorkingDaysInMonth(startOfMonth, endOfMonth);
      
      // Calculate present days (unique employee-date combinations)
      const presentDays = attendanceRecords?.filter(record => 
        record.status === 'present' || record.status === null
      ).length || 0;

      // Calculate late days
      const lateDays = attendanceRecords?.filter(record => 
        record.is_late === true
      ).length || 0;

      // Calculate leave days from approved leave requests
      const leaveDays = leaveRecords?.reduce((total, leave) => {
        return total + (leave.total_days || 0);
      }, 0) || 0;

      // Calculate attendance rate
      const expectedAttendanceDays = totalActiveEmployees * workingDays;
      const actualAttendanceDays = presentDays;
      const attendanceRate = expectedAttendanceDays > 0 
        ? Math.round((actualAttendanceDays / expectedAttendanceDays) * 100)
        : 100;

      const stats = {
        attendanceRate,
        presentDays,
        lateDays,
        leaveDays,
        totalActiveEmployees,
        workingDays
      };

      logger.query('✅ Employee attendance stats calculated:', stats);
      return stats;
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper function to calculate working days in a month (excluding weekends)
function getWorkingDaysInMonth(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}