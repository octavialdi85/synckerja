import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Progress } from '@/features/ui/progress';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatToRupiah } from '../utils/formatCurrency';
import { useWorkScheduleSettings } from './useWorkScheduleSettings';
import { useAttendanceRecords } from './useAttendanceRecords';
import { getCurrentOrganizationId } from '@/features/1-login/hooks/useCurrentOrg';
import { useOptimizedNationalHolidays } from './useOptimizedAttendanceData';
import { useAttendancePenaltyTotal } from './useAttendancePenaltyTotal';
import { EmployeePenaltyCell } from '../components/EmployeePenaltyCell';
import { useQueryClient } from '@tanstack/react-query';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { useLeaveRequests } from './useLeaveRequests';
import { parseDateFromDatabase } from '../utils/dateUtils';

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getMonthName = (month: number) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month];
};

const getDayName = (date: number, month: number, year: number) => {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayIndex = new Date(year, month, date).getDay();
  return dayNames[dayIndex];
};

const isNonWorkingDay = (date: number, month: number, year: number, workingDays: number[] = [1, 2, 3, 4, 5], nationalHolidays: any[] = []) => {
  const dayIndex = new Date(year, month, date).getDay();
  const adjustedDayIndex = dayIndex === 0 ? 7 : dayIndex;
  
  const currentDate = new Date(year, month, date);
  const localYear = currentDate.getFullYear();
  const localMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(currentDate.getDate()).padStart(2, '0');
  const dateString = `${localYear}-${localMonth}-${localDay}`;
  
  const monthDayString = `${localMonth}-${localDay}`;
  
  const isNationalHoliday = nationalHolidays.some(holiday => {
    if (!holiday.is_active || !holiday.applies_to_attendance) return false;
    
    if (holiday.date === dateString) return true;
    
    const holidayDate = new Date(holiday.date);
    const holidayMonth = String(holidayDate.getMonth() + 1).padStart(2, '0');
    const holidayDay = String(holidayDate.getDate()).padStart(2, '0');
    const holidayMonthDay = `${holidayMonth}-${holidayDay}`;
    
    if (holiday.is_recurring || holiday.country_code) {
      return holidayMonthDay === monthDayString;
    }
    
    return false;
  });
  
  if (isNationalHoliday) {
    return true;
  }
  
  const isNonScheduledWorkDay = !workingDays.includes(adjustedDayIndex);
  return isNonScheduledWorkDay;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'H': return 'bg-emerald-200 text-emerald-800 border-emerald-300';
    case 'I': return 'bg-blue-200 text-blue-800 border-blue-300';
    case 'S': return 'bg-yellow-200 text-yellow-800 border-yellow-300';
    case 'C': return 'bg-orange-200 text-orange-800 border-orange-300';
    case 'A': return 'bg-red-200 text-red-800 border-red-300';
    case 'T': return 'bg-purple-200 text-purple-800 border-purple-300';
    default: return 'bg-gray-50 border-gray-200';
  }
};

interface PersonalAttendanceCalendarProps {
  employeeId: string;
}

const PersonalAttendanceCalendar = ({ employeeId }: PersonalAttendanceCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  console.log('📅 PersonalAttendanceCalendar rendered with employeeId:', employeeId);
  
  const { userData } = useCentralizedUserData();
  const { settings: workScheduleSettings, loading: scheduleLoading } = useWorkScheduleSettings();
  const { records: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRecords(organizationId);
  const { data: nationalHolidays = [], isLoading: holidaysLoading } = useOptimizedNationalHolidays();
  const { data: leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests({
    month: currentMonth + 1,
    year: currentYear
  });
  
  const { data: personalPenalties = 0 } = useAttendancePenaltyTotal(employeeId, currentMonth, currentYear);
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  
  console.log('📊 Calendar data status:', {
    employeeId,
    organizationId,
    userData: userData?.full_name,
    scheduleLoading,
    attendanceLoading,
    holidaysLoading,
    leaveLoading,
    attendanceRecordsCount: attendanceRecords.length,
    workScheduleSettingsCount: workScheduleSettings.length
  });
  
  const defaultSchedule = workScheduleSettings.find(schedule => schedule.is_default) || workScheduleSettings[0];
  const workingDays = defaultSchedule?.working_days || [1, 2, 3, 4, 5];
  
  useEffect(() => {
    getCurrentOrganizationId().then(({ organizationId }) => {
      setOrganizationId(organizationId);
    });
  }, []);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const processedEmployeeData = useMemo(() => {
    const attendanceData: { [key: number]: string } = {};
    let totalLateMinutes = 0;
    
    const employeeRecords = attendanceRecords.filter(record => 
      record.employees?.id === employeeId || record.employee_id === employeeId
    );
    
    // Process attendance records
    employeeRecords.forEach(record => {
      const recordDate = new Date(record.attendance_date);
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const day = recordDate.getDate();
        
        if (record.is_late && record.late_minutes && record.late_minutes > 0) {
          totalLateMinutes += record.late_minutes;
        }
        
        if (record.is_late && record.late_minutes && record.late_minutes > 0) {
          attendanceData[day] = 'T';
        } else if (record.status === 'present') {
          attendanceData[day] = 'H';
        } else if (record.status === 'absent') {
          attendanceData[day] = 'A';
        } else if (record.status === 'sick') {
          attendanceData[day] = 'S';
        } else if (record.status === 'leave') {
          attendanceData[day] = 'C';
        } else if (record.status === 'permission') {
          attendanceData[day] = 'I';
        }
      }
    });

    // Process approved leave requests for the employee
    const employeeLeaveRequests = leaveRequests.filter(leave => 
      leave.employee_id === employeeId && leave.status === 'approved'
    );
    
    employeeLeaveRequests.forEach(leave => {
      const startDate = parseDateFromDatabase(leave.start_date);
      const endDate = parseDateFromDatabase(leave.end_date);
      
      // Mark all days in the leave period as 'C' (Cuti)
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          const day = date.getDate();
          // Only mark as leave if there's no existing attendance record
          if (!attendanceData[day]) {
            attendanceData[day] = 'C';
          }
        }
      }
    });
    
    return {
      attendanceData,
      totalLateMinutes
    };
  }, [attendanceRecords, leaveRequests, employeeId, currentMonth, currentYear]);

  const calculateWorkingDays = () => {
    let workingDaysCount = 0;
    for (let date = 1; date <= daysInMonth; date++) {
      if (!isNonWorkingDay(date, currentMonth, currentYear, workingDays, nationalHolidays)) {
        workingDaysCount++;
      }
    }
    return workingDaysCount;
  };

  const totalWorkingDays = calculateWorkingDays();

  const calculateStats = (attendanceData: any) => {
    const stats = { H: 0, A: 0, C: 0, I: 0, S: 0, T: 0 };
    Object.values(attendanceData).forEach((status: any) => {
      if (stats.hasOwnProperty(status)) {
        stats[status as keyof typeof stats]++;
      }
    });
    return stats;
  };

  const stats = calculateStats(processedEmployeeData.attendanceData);
  const attendanceRate = totalWorkingDays > 0 ? Math.round((stats.H / totalWorkingDays) * 100) : 0;

  if (scheduleLoading || holidaysLoading || attendanceLoading || leaveLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Kalendar Kehadiran</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold text-gray-800 min-w-[150px] text-center">
              {getMonthName(currentMonth)} {currentYear}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Employee name and summary stats */}
        <div className="bg-slate-50 px-4 py-3 rounded-lg mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-medium text-gray-900">{userData?.full_name || 'Loading...'}</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
              <span>Hari Kerja: <strong className="text-gray-800">{totalWorkingDays}</strong></span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>Tingkat Kehadiran: <strong className="text-emerald-600">{attendanceRate}%</strong></span>
                </div>
                <Progress value={attendanceRate} className="h-2 w-full sm:w-32" />
              </div>
              <span className="hidden sm:inline">Denda Bulan Ini: <strong className="text-red-600">{formatToRupiah(personalPenalties)}</strong></span>
              <span className="sm:hidden">Denda: <strong className="text-red-600">{formatToRupiah(personalPenalties)}</strong></span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-emerald-200 text-emerald-800 rounded text-xs flex items-center justify-center font-medium border border-emerald-300">H</span>
            <span className="text-gray-600">Hadir</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded text-xs flex items-center justify-center font-medium border border-blue-300">I</span>
            <span className="text-gray-600">Izin</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-yellow-200 text-yellow-800 rounded text-xs flex items-center justify-center font-medium border border-yellow-300">S</span>
            <span className="text-gray-600">Sakit</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-orange-200 text-orange-800 rounded text-xs flex items-center justify-center font-medium border border-orange-300">C</span>
            <span className="text-gray-600">Cuti</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-red-200 text-red-800 rounded text-xs flex items-center justify-center font-medium border border-red-300">A</span>
            <span className="text-gray-600">Alfa</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-purple-200 text-purple-800 rounded text-xs flex items-center justify-center font-medium border border-purple-300">T</span>
            <span className="text-gray-600">Terlambat</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto max-h-[750px]">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden min-w-[280px]">
          {/* Days of week header */}
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
            <div key={day} className="bg-slate-700 text-white p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
              {day}
            </div>
          ))}
          
          {/* Calendar dates with proper positioning */}
          {(() => {
            // Get first day of month (0=Sunday, 1=Monday, ..., 6=Saturday)
            const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
            // Convert to Monday=0 format (0=Monday, 1=Tuesday, ..., 6=Sunday)
            const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            
            const cells = [];
            
            // Add empty cells for offset
            for (let i = 0; i < adjustedFirstDay; i++) {
              cells.push(
                <div key={`empty-${i}`} className="bg-gray-100 p-2 sm:p-3 min-h-[50px] sm:min-h-[60px]"></div>
              );
            }
            
            // Add actual dates
            for (let date = 1; date <= daysInMonth; date++) {
              const status = processedEmployeeData.attendanceData[date];
              const isNonWorking = isNonWorkingDay(date, currentMonth, currentYear, workingDays, nationalHolidays);
              
              cells.push(
                <div 
                  key={date} 
                  className={`p-2 sm:p-3 min-h-[50px] sm:min-h-[60px] flex flex-col items-center justify-center border-r border-b border-gray-100 ${
                    isNonWorking ? 'bg-red-500 text-white' : status ? getStatusColor(status) : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm sm:text-lg font-semibold mb-1 ${isNonWorking ? 'text-white' : 'text-gray-800'}`}>{date}</span>
                  {status && (
                    <span className="text-xs font-bold px-1 py-0.5 sm:px-2 sm:py-1 rounded border text-current">
                      {status}
                    </span>
                  )}
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
        
        {/* Summary section */}
        <div className="bg-gray-50 p-4 border-t space-y-4 overflow-y-auto max-h-[300px]">
          {/* Attendance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4 text-center">
            <div className="bg-emerald-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-emerald-700">{stats.H}</div>
              <div className="text-xs text-emerald-600">Hadir</div>
            </div>
            <div className="bg-red-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-red-700">{stats.A}</div>
              <div className="text-xs text-red-600">Alfa</div>
            </div>
            <div className="bg-orange-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-orange-700">{stats.C}</div>
              <div className="text-xs text-orange-600">Cuti</div>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-blue-700">{stats.I}</div>
              <div className="text-xs text-blue-600">Izin</div>
            </div>
            <div className="bg-yellow-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-yellow-700">{stats.S}</div>
              <div className="text-xs text-yellow-600">Sakit</div>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded border">
              <div className="text-sm sm:text-lg font-bold text-purple-700">{stats.T}</div>
              <div className="text-xs text-purple-600">Terlambat</div>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Rincian Keterlambatan & Denda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{processedEmployeeData.totalLateMinutes}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Menit Terlambat</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.floor(processedEmployeeData.totalLateMinutes / 60)}j {processedEmployeeData.totalLateMinutes % 60}m
                </div>
              </div>
              
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                <div className="text-lg sm:text-2xl font-bold text-red-600">{formatToRupiah(personalPenalties)}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Denda Bulan Ini</div>
                <div className="text-xs text-gray-500 mt-1">
                  Berdasarkan aturan perusahaan
                </div>
              </div>
              
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 sm:col-span-2 lg:col-span-1">
                <div className="text-lg sm:text-2xl font-bold text-amber-600">{stats.T}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Hari Terlambat</div>
                <div className="text-xs text-gray-500 mt-1">
                  Rata-rata: {stats.T > 0 ? Math.round(processedEmployeeData.totalLateMinutes / stats.T) : 0} menit/hari
                </div>
              </div>
            </div>
            
            {/* Monthly Performance */}
            <div className="mt-4 bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <h5 className="text-sm font-medium text-gray-800 mb-2">Performa Kehadiran Bulan Ini</h5>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span>Kehadiran: <strong className="text-emerald-600">{attendanceRate}%</strong></span>
                  <span>Keterlambatan: <strong className="text-purple-600">{totalWorkingDays > 0 ? Math.round((stats.T / totalWorkingDays) * 100) : 0}%</strong></span>
                  <span>Absensi: <strong className="text-red-600">{totalWorkingDays > 0 ? Math.round((stats.A / totalWorkingDays) * 100) : 0}%</strong></span>
                </div>
                <div className="text-xs text-gray-500">
                  {getMonthName(currentMonth)} {currentYear}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalAttendanceCalendar;
