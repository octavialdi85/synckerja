import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeData } from './useRealtimeData';

interface WorkSchedule {
  id: string;
  name: string;
  working_days: number[];
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
  late_tolerance_minutes: number;
  overtime_threshold_minutes: number;
  is_default: boolean;
  is_active: boolean;
  timezone: string;
  organization_id: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
  is_active: boolean;
  applies_to_attendance: boolean;
  country_code?: string | null;
}

type ScheduleStatus = "active" | "upcoming" | "completed" | "off" | "holiday";

interface ScheduleDay {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  location: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
}

export const useWorkSchedule = () => {
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const generateWeeklySchedule = (schedule: WorkSchedule, holidays: Holiday[]): ScheduleDay[] => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const schedules: ScheduleDay[] = [];

    // Generate 7 days starting from Monday of current week
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday
      date.setDate(today.getDate() + mondayOffset + i);
      
      const dayOfWeek = date.getDay();
      const dbDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
      
      // Check if this day is in working_days array - make sure schedule exists and has working_days
      const isScheduledDay =
        schedule &&
        Array.isArray(schedule.working_days) &&
        schedule.working_days.includes(dbDayOfWeek);
      console.log(
        `📅 Day ${dayOfWeek} (DB: ${dbDayOfWeek}): isScheduledDay = ${isScheduledDay}, working_days = ${JSON.stringify(
          schedule?.working_days,
        )}, schedule exists = ${!!schedule}`,
      );

      const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;

      const matchedHoliday = holidays.find((holiday) => {
        if (!holiday.is_active || !holiday.applies_to_attendance) return false;

        if (holiday.is_recurring || holiday.country_code) {
          const holidayDate = new Date(holiday.date);
          return (
            holidayDate.getMonth() === date.getMonth() &&
            holidayDate.getDate() === date.getDate()
          );
        }

        return holiday.date === isoDate;
      });

      const isHoliday = Boolean(matchedHoliday);

      let status: ScheduleStatus = "off";
      if (isHoliday) {
        status = "holiday";
      } else if (isScheduledDay) {
        if (date.toDateString() === today.toDateString()) {
          status = "active";
        } else if (date < today) {
          status = "completed";
        } else {
          status = "upcoming";
        }
      }

      const isWorkingDay = isScheduledDay && !isHoliday;

      schedules.push({
        day: dayNames[dayOfWeek],
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        startTime:
          isWorkingDay && status !== "holiday" ? schedule.start_time.slice(0, 5) : "-",
        endTime:
          isWorkingDay && status !== "holiday" ? schedule.end_time.slice(0, 5) : "-",
        status,
        location: 'Kantor',
        isWorkingDay,
        isHoliday,
        holidayName: matchedHoliday?.name ?? null,
      });
    }

    return schedules;
  };

  const fetchWorkSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Starting work schedule fetch...');

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('🔍 Current user:', user.id);

      // Get user's active organization first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Profile data:', profileData, 'Error:', profileError);

      if (profileError || !profileData?.active_organization_id) {
        throw profileError || new Error('No active organization found');
      }

      // Set organization ID for realtime updates
      setOrganizationId(profileData.active_organization_id);

      // Get employee data for the active organization
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', profileData.active_organization_id)
        .single();

      console.log('👤 Employee data:', employeeData, 'Error:', employeeError);

      if (employeeError) {
        throw employeeError;
      }

      // Try cache first (per org)
      const cacheKey = `mobile.workSchedule.${employeeData.organization_id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { schedule: WorkSchedule; weekly: ScheduleDay[]; ts: number };
          setWorkSchedule(parsed.schedule);
          setScheduleData(parsed.weekly);
          setInitialized(true);
        } catch {}
      }

      // Convert JS day (0=Sunday) to DB day (7=Sunday)
      const currentDay = new Date().getDay();
      const dbDay = currentDay === 0 ? 7 : currentDay;
      console.log('📅 Current day:', currentDay, 'DB day:', dbDay);

      // Fetch work schedule settings for today's specific day using PostgreSQL array operator
      let { data: scheduleData, error: scheduleError } = await supabase
        .from('work_schedule_settings')
        .select('*')
        .eq('organization_id', employeeData.organization_id)
        .eq('is_active', true)
        .eq('is_default', true)
        .contains('working_days', [dbDay])
        .maybeSingle();

      console.log('📋 Schedule query result:', scheduleData, 'Error:', scheduleError);
      // If no schedule for today found, get any active schedule
      if (!scheduleData) {
        console.log('⚠️ No schedule for today, trying fallback...');
        const { data: fallbackSchedule, error: fallbackError } = await supabase
          .from('work_schedule_settings')
          .select('*')
          .eq('organization_id', employeeData.organization_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        scheduleData = fallbackSchedule;
        scheduleError = fallbackError;
        console.log('📋 Fallback schedule:', scheduleData, 'Error:', scheduleError);
      }

      if (scheduleError) {
        throw scheduleError;
      }

      // Fetch active holidays that apply to attendance
      const { data: holidaysData } = await supabase
        .from("national_holidays")
        .select("id, name, date, is_recurring, is_active, applies_to_attendance, country_code")
        .or(`organization_id.eq.${employeeData.organization_id},organization_id.is.null`)
        .eq("is_active", true)
        .eq("applies_to_attendance", true);

      const activeHolidays: Holiday[] = holidaysData ?? [];

      if (scheduleData) {
        console.log('✅ Setting work schedule:', scheduleData);
        console.log('🕐 Late tolerance minutes:', scheduleData.late_tolerance_minutes);
        setWorkSchedule(scheduleData);
        const weekly = generateWeeklySchedule(scheduleData, activeHolidays);
        setScheduleData(weekly);
        // Update cache
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ schedule: scheduleData, weekly, ts: Date.now() }));
        } catch {}
      } else {
        console.log('❌ No schedule data found');
      }
    } catch (err) {
      console.error('Error fetching work schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch work schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 useWorkSchedule: Initial fetch on mount');
    fetchWorkSchedule();
  }, []);

  useEffect(() => {
    console.log('🚀 useWorkSchedule: Organization ID changed:', organizationId);
  }, [organizationId]);

  // Setup realtime updates for work schedule settings (guarded by orgId)
  useRealtimeData(
    organizationId ? [
      {
        table: 'work_schedule_settings',
        filter: { column: 'organization_id', eq: organizationId },
        onInsert: () => {
          console.log('📡 New work schedule created, refetching...', organizationId);
          fetchWorkSchedule();
        },
        onUpdate: () => {
          console.log('📡 Work schedule updated, refetching...', organizationId);
          console.log('📡 Current tolerance before update:', workSchedule?.late_tolerance_minutes);
          fetchWorkSchedule();
        },
        onDelete: () => {
          console.log('📡 Work schedule deleted, refetching...', organizationId);
          fetchWorkSchedule();
        }
      }
    ] : []
  );

  // Force re-render when workSchedule changes
  useEffect(() => {
    if (workSchedule) {
      console.log('📋 Work schedule data updated:', {
        name: workSchedule.name,
        lateTolerance: workSchedule.late_tolerance_minutes,
        organizationId: workSchedule.organization_id
      });
    }
  }, [workSchedule]);

  return {
    workSchedule,
    scheduleData,
    loading,
    error,
    refetch: fetchWorkSchedule,
  };
};