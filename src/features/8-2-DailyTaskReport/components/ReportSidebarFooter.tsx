import React, { useMemo } from 'react';
import { useDailyTaskReport } from '../context/ReportContext';
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';

/**
 * ReportSidebarFooter Component
 * 
 * Footer untuk sidebar (col-span-3) yang menampilkan:
 * - Total blockers
 * - Unresolved blockers
 * - Recent updates count
 * 
 * @component
 */
export const ReportSidebarFooter = () => {
  const {
    filteredBlockers: blockers,
    filteredRecentUpdates: recentUpdates,
    loading,
  } = useDailyTaskReport();

  const stats = useMemo(() => {
    const totalBlockers = blockers?.length || 0;
    const unresolvedBlockers = blockers?.filter((b: any) => !b.is_resolved).length || 0;
    const resolvedBlockers = totalBlockers - unresolvedBlockers;
    const updatesCount = recentUpdates?.length || 0;

    return {
      totalBlockers,
      unresolvedBlockers,
      resolvedBlockers,
      updatesCount,
    };
  }, [blockers, recentUpdates]);

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
      <div className="flex items-center justify-between">
        {/* Left: Blockers Stats */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-gray-800">
            Blockers: {stats.totalBlockers}
          </span>
          {stats.unresolvedBlockers > 0 && (
            <span className="text-xs text-red-600 font-medium">
              ({stats.unresolvedBlockers} unresolved)
            </span>
          )}
        </div>

        {/* Right: Updates Stats */}
        {stats.updatesCount > 0 && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-700">
              Updates: {stats.updatesCount}
            </span>
          </div>
        )}
      </div>

      {/* Resolved Blockers (if any) - on second line */}
      {stats.resolvedBlockers > 0 && (
        <div className="flex items-center justify-start mt-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">
              Resolved: {stats.resolvedBlockers}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

