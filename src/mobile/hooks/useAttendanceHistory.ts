import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeData } from "./useRealtimeData";

interface AttendanceHistoryItem {
  id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  is_late: boolean;
  late_minutes: number;
  working_hours_minutes: number;
  penalties: {
    penalty_amount: number;
    penalty_reason: string;
    status: string;
  }[];
}

export const useAttendanceHistory = () => {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's active organization first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.active_organization_id) {
        setError("No active organization found");
        return;
      }

      // Get employee data for the active organization
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', profileData.active_organization_id)
        .single();

      if (employeeError) {
        setError("Failed to get employee data");
        return;
      }

      setOrganizationId(employee.organization_id);

      // Try cache first (per employee)
      const cacheKey = `mobile.attendanceHistory.${employee.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { items: AttendanceHistoryItem[]; ts: number };
          setAttendanceHistory(parsed.items);
        } catch {}
      }

      // Get attendance records with penalties
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          attendance_date,
          check_in_time,
          check_out_time,
          status,
          is_late,
          late_minutes,
          working_hours_minutes
        `)
        .eq('employee_id', employee.id)
        .order('attendance_date', { ascending: false })
        .limit(20);

      if (attendanceError) {
        setError("Failed to fetch attendance data");
        return;
      }

      // Get penalties for each attendance record
      const attendanceIds = attendanceData?.map(record => record.id) || [];
      const { data: penaltiesData, error: penaltiesError } = await supabase
        .from('attendance_penalties')
        .select(`
          attendance_record_id,
          penalty_amount,
          penalty_reason,
          status
        `)
        .in('attendance_record_id', attendanceIds)
        .eq('status', 'active');

      if (penaltiesError) {
        console.warn("Failed to fetch penalties data:", penaltiesError);
      }

      // Combine attendance with penalties
      const combinedData: AttendanceHistoryItem[] = attendanceData?.map(record => ({
        ...record,
        penalties: penaltiesData?.filter(penalty => penalty.attendance_record_id === record.id) || []
      })) || [];

      setAttendanceHistory(combinedData);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ items: combinedData, ts: Date.now() }));
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime updates for attendance history
  const { isConnected: realtimeConnected } = useRealtimeData(
    organizationId ? [
      {
        table: 'attendance_records',
        filter: { column: 'organization_id', eq: organizationId },
        onInsert: () => {
          console.log('📡 New attendance record, refetching history...');
          fetchAttendanceHistory();
        },
        onUpdate: () => {
          console.log('📡 Attendance record updated, refetching history...');
          fetchAttendanceHistory();
        },
        onDelete: () => {
          console.log('📡 Attendance record deleted, refetching history...');
          fetchAttendanceHistory();
        }
      },
      {
        table: 'attendance_penalties',
        filter: { column: 'organization_id', eq: organizationId },
        onInsert: () => {
          console.log('📡 New penalty added, refetching history...');
          fetchAttendanceHistory();
        },
        onUpdate: () => {
          console.log('📡 Penalty updated, refetching history...');
          fetchAttendanceHistory();
        },
        onDelete: () => {
          console.log('📡 Penalty removed, refetching history...');
          fetchAttendanceHistory();
        }
      }
    ] : []
  );

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  return {
    attendanceHistory,
    loading,
    error,
    realtimeConnected,
    refetch: fetchAttendanceHistory
  };
};