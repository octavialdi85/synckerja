
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Progress } from '@/features/ui/progress';
import { Timer, BarChart3, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useEmployeeAttendanceStats } from './useEmployeeAttendanceStats';

interface AttendanceStatsProps {
  workingHoursToday: string;
}

export const AttendanceStats = ({ workingHoursToday }: AttendanceStatsProps) => {
  const { data: realStats, isLoading } = useEmployeeAttendanceStats();
  
  // Use real data if available, otherwise show loading or default
  const stats = realStats || {
    attendanceRate: 0,
    presentDays: 0,
    lateDays: 0,
    leaveDays: 0
  };
  return (
    <>
      {/* Work Hours Today */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Timer className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-medium">Total Jam Kerja Hari Ini:</span>
        </div>
        <span className="text-sm font-bold text-blue-600">{workingHoursToday}</span>
      </div>

      {/* Statistics Section */}
      <Card className="mt-3">
        <CardHeader className="pb-1 px-2">
          <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
            <BarChart3 className="h-4 w-4" />
            <span>Statistik Bulan Ini</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1 px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-xs text-gray-500">Memuat statistik...</div>
            </div>
          ) : (
          <div className="space-y-2">
            {/* Attendance Rate */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold">Kehadiran</span>
                <span className="text-sm font-bold text-green-600">{stats.attendanceRate}%</span>
              </div>
              <Progress value={stats.attendanceRate} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-0">
              <div className="text-center p-1 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-lg font-bold text-green-600">{stats.presentDays}</span>
                </div>
                <p className="text-xs font-medium text-green-700">Hari Hadir</p>
              </div>
              
              <div className="text-center p-1 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                  <span className="text-lg font-bold text-orange-600">{stats.lateDays}</span>
                </div>
                <p className="text-xs font-medium text-orange-700">Terlambat</p>
              </div>
              
              <div className="text-center p-1 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="text-lg font-bold text-blue-600">{stats.leaveDays}</span>
                </div>
                <p className="text-xs font-medium text-blue-700">Izin/Cuti</p>
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

