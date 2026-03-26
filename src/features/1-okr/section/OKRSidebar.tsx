import React, { useMemo } from 'react';
import { Target, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { filterValidCycleIds } from '@/utils/uuidValidation';
import { isEmployeeActive } from '@/features/2-1-employees/utils/employeeUtils';

interface OKRSidebarProps {
  activeTab: string;
  organizationId?: string;
  companyStats?: {
    avgProgress: number;
    totalObjectives: number;
    nextDeadline: string;
    active?: number;
    draft?: number;
    completed?: number;
  };
  departmentStats?: {
    avgProgress: number;
    totalObjectives: number;
    nextDeadline: string;
    active?: number;
    draft?: number;
    completed?: number;
  };
  individualStats?: {
    avgProgress: number;
    totalObjectives: number;
    nextDeadline: string;
    active?: number;
    draft?: number;
    completed?: number;
  };
  cycleIds?: string[];
}

export const OKRSidebar = ({
  activeTab,
  organizationId,
  companyStats,
  departmentStats,
  individualStats,
  cycleIds
}: OKRSidebarProps) => {
  const getStatusNameFromJoin = (row: {
    employee_statuses?: { name?: string } | { name?: string }[] | null;
  }) => {
    const es = row.employee_statuses;
    if (!es) return null;
    if (Array.isArray(es)) return es[0]?.name ?? null;
    return es.name ?? null;
  };

  // Get current stats based on active tab
  const currentStats = useMemo(() => {
    if (activeTab === 'department-objectives') return departmentStats;
    if (activeTab === 'individual-objectives') return individualStats;
    return companyStats;
  }, [activeTab, companyStats, departmentStats, individualStats]);

  // Fetch recent check-ins
  const { data: recentCheckins = [] } = useQuery({
    queryKey: ['recent-checkins-okr', organizationId, cycleIds],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('weekly_checkins')
        .select(`
          id,
          week_start_date,
          current_value,
          status,
          comments,
          created_at,
          employees!weekly_checkins_employee_id_fkey (
            full_name,
            employee_status_id,
            pending_removal,
            employee_statuses!left(name)
          ),
          key_results!weekly_checkins_key_result_id_fkey (
            title,
            company_objective_id,
            department_objective_id,
            individual_objective_id
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recent check-ins:', error);
        return [];
      }

      // SECURITY: Keep check-ins only from active employees.
      const filteredCheckins = (data || []).filter((checkin: any) => {
        const employee = checkin.employees;
        if (!employee) return true; // Keep if no employee data
        return isEmployeeActive({
          employee_status_name: getStatusNameFromJoin(employee),
          status: null,
          pending_removal: employee.pending_removal,
        });
      });

      return filteredCheckins;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch top performers (departments or individuals with highest progress)
  const { data: topPerformers = [] } = useQuery({
    queryKey: ['top-performers-okr', organizationId, activeTab, cycleIds],
    queryFn: async () => {
      if (!organizationId) return [];

      if (activeTab === 'department-objectives') {
        // Get top departments by average progress
        let query = supabase
          .from('department_objectives')
          .select('department_id, progress_percentage, departments!department_objectives_department_id_fkey(name)')
          .eq('organization_id', organizationId);

        // Filter by valid cycle IDs only
        const validCycleIds = filterValidCycleIds(cycleIds);
        if (validCycleIds.length > 0) {
          query = query.in('cycle_id', validCycleIds);
        }

        const { data: deptObjectives, error } = await query;

        if (error || !deptObjectives) return [];

        // Group by department and calculate average progress
        const deptProgress: Record<string, { name: string; progress: number; count: number }> = {};
        deptObjectives.forEach(obj => {
          const deptId = obj.department_id;
          if (!deptId) return;
          
          const deptName = (obj.departments as any)?.name || 'Unknown Department';
          if (!deptProgress[deptId]) {
            deptProgress[deptId] = { name: deptName, progress: 0, count: 0 };
          }
          deptProgress[deptId].progress += obj.progress_percentage || 0;
          deptProgress[deptId].count += 1;
        });

        // Calculate average and sort
        return Object.values(deptProgress)
          .map(dept => ({
            id: dept.name,
            name: dept.name,
            progress: Math.round(dept.progress / dept.count),
            type: 'department' as const
          }))
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 5);
      } else if (activeTab === 'individual-objectives') {
        // Get top individuals by average progress
        let query = supabase
          .from('individual_objectives')
          .select(`
            employee_id,
            progress_percentage,
            employees!individual_objectives_employee_id_fkey(
              full_name,
              employee_status_id,
              pending_removal,
              employee_statuses!left(name)
            )
          `)
          .eq('organization_id', organizationId);

        // Filter by valid cycle IDs only
        const validCycleIds = filterValidCycleIds(cycleIds);
        if (validCycleIds.length > 0) {
          query = query.in('cycle_id', validCycleIds);
        }

        const { data: indivObjectives, error } = await query;

        if (error || !indivObjectives) return [];

        // Group by employee and calculate average progress
        // Filter out terminated employees
        const empProgress: Record<string, { name: string; progress: number; count: number }> = {};
        indivObjectives.forEach(obj => {
          const empId = obj.employee_id;
          if (!empId) return;
          
          const employee = obj.employees as any;
          const empName = employee?.full_name || 'Unknown Employee';
          
          if (
            !isEmployeeActive({
              employee_status_name: getStatusNameFromJoin(employee || {}),
              status: null,
              pending_removal: employee?.pending_removal,
            })
          ) {
            return; // Skip non-active employees
          }
          
          if (!empProgress[empId]) {
            empProgress[empId] = { name: empName, progress: 0, count: 0 };
          }
          empProgress[empId].progress += obj.progress_percentage || 0;
          empProgress[empId].count += 1;
        });

        // Calculate average and sort
        return Object.values(empProgress)
          .map(emp => ({
            id: emp.name,
            name: emp.name,
            progress: Math.round(emp.progress / emp.count),
            type: 'individual' as const
          }))
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 5);
      }

      return [];
    },
    enabled: !!organizationId && (activeTab === 'department-objectives' || activeTab === 'individual-objectives'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Total Objectives</p>
              <p className="text-lg font-bold text-blue-900">{currentStats?.totalObjectives || 0}</p>
            </div>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Active</p>
              <p className="text-lg font-bold text-green-900">{currentStats?.active || 0}</p>
            </div>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-800">Completed</p>
              <p className="text-lg font-bold text-purple-900">{currentStats?.completed || 0}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-800">Avg Progress</p>
              <p className="text-lg font-bold text-orange-900">{currentStats?.avgProgress || 0}%</p>
            </div>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            Top Performers
          </h4>
          <div className="space-y-2">
            {topPerformers.map((performer, index) => (
              <div key={performer.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                      <p className="text-xs text-gray-500">
                        {performer.type === 'department' ? 'Department' : 'Individual'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{performer.progress}%</p>
                    <p className="text-xs text-gray-500">Progress</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Recent Activity
        </h4>
        <div className="space-y-2">
          {recentCheckins.length > 0 ? (
            recentCheckins.map((checkin: any) => (
              <div key={checkin.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {checkin.employees?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {checkin.key_results?.title || 'Check-in'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {checkin.created_at ? format(new Date(checkin.created_at), 'MMM dd, HH:mm') : 'N/A'}
                    </p>
                  </div>
                  <div className={`ml-2 w-2 h-2 rounded-full flex-shrink-0 ${
                    checkin.status === 'on_track' ? 'bg-green-500' :
                    checkin.status === 'at_risk' ? 'bg-yellow-500' :
                    checkin.status === 'off_track' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400 text-xs">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
































