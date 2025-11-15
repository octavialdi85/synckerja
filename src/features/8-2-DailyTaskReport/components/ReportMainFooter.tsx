import React, { useMemo } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { CheckCircle, Clock, AlertCircle, ClipboardList } from 'lucide-react';

/**
 * ReportMainFooter Component
 * 
 * Footer untuk section utama (col-span-9) yang menampilkan:
 * - Total assignments
 * - Completed assignments
 * - On-time completion rate
 * - Late assignments
 * 
 * @component
 */
export const ReportMainFooter = () => {
  const { filtered: rows, loading } = useDailyTaskReport();

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        total: 0,
        completed: 0,
        onTime: 0,
        late: 0,
        completionRate: 0,
        onTimeRate: 0,
      };
    }

    const total = rows.length;
    const completed = rows.filter((r) => r.isCompleted).length;
    const onTime = rows.filter((r) => r.isCompleted && r.isOnTime === true).length;
    const late = rows.filter((r) => r.isCompleted && r.isOnTime === false).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

    return {
      total,
      completed,
      onTime,
      late,
      completionRate,
      onTimeRate,
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-center text-xs text-gray-400">
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-3 flex-shrink-0 relative z-10"
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Total and Completed */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-800">
              Total: {stats.total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-700">
              Completed: {stats.completed} ({stats.completionRate}%)
            </span>
          </div>
        </div>

        {/* Right: On-time and Late */}
        <div className="flex items-center gap-4">
          {stats.completed > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-700">
                  On-time: {stats.onTime} ({stats.onTimeRate}%)
                </span>
              </div>
              {stats.late > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-gray-700">Late: {stats.late}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

