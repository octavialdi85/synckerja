import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeAttendance } from "./useRealtimeData";

export const useAttendanceData = () => {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [officeLocation, setOfficeLocation] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [workSchedule, setWorkSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Reset all data when organization changes
      setTodayAttendance(null);
      setOfficeLocation(null);
      setTodaySchedule(null);
      setWorkSchedule(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's active organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) return;

      // Check if organization changed
      if (activeOrganizationId && activeOrganizationId !== profile.active_organization_id) {
        console.log('Organization changed from', activeOrganizationId, 'to', profile.active_organization_id);
      }
      
      setActiveOrganizationId(profile.active_organization_id);

      // Get employee data for the active organization
      const { data: employee } = await supabase
        .from('employees')
        .select(`
          id, 
          organization_id,
          departments!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .limit(1)
        .single();

      if (!employee) return;

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('attendance_date', today)
        .maybeSingle();

      setTodayAttendance(attendance);

      // Get office location
      const { data: offices } = await supabase
        .from('office_locations')
        .select('*')
        .eq('organization_id', employee.organization_id)
        .eq('is_active', true)
        .limit(1);

      if (offices && offices.length > 0) {
        const office = offices[0];
        setOfficeLocation({
          name: office.name,
          address: office.address,
          latitude: typeof office.latitude === 'string' ? parseFloat(office.latitude) : office.latitude,
          longitude: typeof office.longitude === 'string' ? parseFloat(office.longitude) : office.longitude,
          radius: office.radius_meters
        });
      }

      // Get work schedule from work_schedule_settings - try default first, then any active one
      let { data: workScheduleData } = await supabase
        .from('work_schedule_settings')
        .select('*')
        .eq('organization_id', employee.organization_id)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();

      // If no default found, get any active work schedule
      if (!workScheduleData) {
        const { data: fallbackSchedule } = await supabase
          .from('work_schedule_settings')
          .select('*')
          .eq('organization_id', employee.organization_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        workScheduleData = fallbackSchedule;
      }

      if (workScheduleData) {
        setWorkSchedule(workScheduleData);
        
        // Check if today is a working day - convert JS day (0=Sunday) to DB day (7=Sunday)
        const currentDay = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
        const dbDay = currentDay === 0 ? 7 : currentDay; // Convert Sunday from 0 to 7
        const isWorkingDay = workScheduleData.working_days?.includes(dbDay);
        console.log(`🔍 Current day: ${currentDay}, DB day: ${dbDay}, Working days: ${JSON.stringify(workScheduleData.working_days)}, Is working day: ${isWorkingDay}`);
        
        setTodaySchedule({
          startTime: workScheduleData.start_time?.substring(0, 5) || "08:00",
          endTime: workScheduleData.end_time?.substring(0, 5) || "17:00",
          location: officeLocation?.name || "Kantor Pusat",
          department: employee?.departments?.name || "IT Department",
          notes: isWorkingDay ? "Hari kerja sesuai jadwal" : "Hari ini libur",
          isWorkingDay,
          lateToleranceMinutes: workScheduleData.late_tolerance_minutes || 0,
          breakStartTime: workScheduleData.break_start_time?.substring(0, 5),
          breakEndTime: workScheduleData.break_end_time?.substring(0, 5)
        });
      } else {
        // Fallback if no work schedule found
        setTodaySchedule({
          startTime: "08:00",
          endTime: "17:00", 
          location: officeLocation?.name || "Kantor Pusat",
          department: employee?.departments?.name || "IT Department",
          notes: "Jadwal kerja default",
          isWorkingDay: true,
          lateToleranceMinutes: 0
        });
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime attendance updates - only when organizationId is available
  const { isConnected: realtimeConnected } = useRealtimeAttendance(
    activeOrganizationId && activeOrganizationId.length > 0 ? activeOrganizationId : 'skip',
    () => {
      console.log('📡 Real-time attendance update detected, refetching data...');
      fetchAttendanceData();
    }
  );

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Listen for profile changes (organization switching)
  useEffect(() => {
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'active_organization_id=neq.null'
        },
        (payload) => {
          console.log('Profile updated, refetching attendance data:', payload);
          // Small delay to ensure the change is committed
          setTimeout(() => {
            fetchAttendanceData();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    todayAttendance,
    officeLocation,
    todaySchedule,
    workSchedule,
    loading,
    realtimeConnected,
    refetch: fetchAttendanceData
  };
};