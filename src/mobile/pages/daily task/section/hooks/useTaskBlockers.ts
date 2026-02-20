import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskStep as TaskStepEntity } from '@/features/8-2-DailyTask/DailyTaskContext';
import { logger } from '@/config/logger';

interface UseTaskBlockersProps {
  getVisibleSteps: (task: Task) => TaskStepEntity[];
}

/**
 * Custom hook for managing task blockers modal
 */
export const useTaskBlockers = ({ getVisibleSteps }: UseTaskBlockersProps) => {
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalItems, setBlockerModalItems] = useState<any[]>([]);
  const [loadingBlockers, setLoadingBlockers] = useState(false);

  const openTaskBlockers = useCallback(async (task: Task) => {
    setBlockerModalItems([]);
    setBlockerModalOpen(true);
    setLoadingBlockers(true);

    try {
      // Use getVisibleSteps from hook to show steps based on filters
      const visibleSteps = getVisibleSteps(task);
      const stepIds = visibleSteps.map(s => s.id);
      
      // OPTIMIZATION: Fetch sub-steps
      const subStepsResult = stepIds.length > 0
        ? await supabase
            .from('task_steps_to_steps')
            .select('id, title, parent_step_id')
            .in('parent_step_id', stepIds)
        : { data: [] as { id: string; title: string; parent_step_id: string }[], error: null };

      // Fetch history for steps with timeout
      let stepHistoryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null };
      if (stepIds.length > 0) {
        stepHistoryResult = await supabase
          .from('task_step_history')
          .select('*')
          .eq('action_type', 'blocker_added')
          .in('task_step_id', stepIds)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      const subSteps = subStepsResult?.data || [];
      const subById: Record<string, any> = {};
      subSteps.forEach((s: any) => { subById[s.id] = s; });
      const subIds = subSteps.map((s: any) => s.id);

      // Fetch sub-step history ONLY if we have sub-steps
      let subStepHistoryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null };
      if (subIds.length > 0) {
        subStepHistoryResult = await supabase
          .from('task_step_history')
          .select('*')
          .eq('action_type', 'blocker_added')
          .in('task_steps_to_steps_id', subIds)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      // Combine and filter history
      let allHistory: any[] = [];
      
      if (stepHistoryResult?.data) {
        const unresolvedStepHistory = stepHistoryResult.data.filter((h: any) => 
          h.is_resolved === null || h.is_resolved === false
        );
        allHistory = [...allHistory, ...unresolvedStepHistory];
      }
      
      if (subStepHistoryResult?.data) {
        const unresolvedSubStepHistory = subStepHistoryResult.data.filter((h: any) => 
          h.is_resolved === null || h.is_resolved === false
        );
        allHistory = [...allHistory, ...unresolvedSubStepHistory];
      }
      
      // Sort combined history by created_at
      allHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Get unique created_by user IDs
      const createdByUserIds = [...new Set(allHistory.map((h: any) => h.created_by).filter(Boolean))];
      
      // Fetch employee data for created_by users
      let employeeMap: Record<string, any> = {};
      if (createdByUserIds.length > 0) {
        try {
          const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('id, full_name, user_id')
            .in('user_id', createdByUserIds);
          type EmpRow = { id: string; full_name: string; user_id: string };
          const employees = (employeesData as unknown as EmpRow[] | null) ?? [];
          if (!employeesError && employees.length) {
            employees.forEach((emp) => {
              if (emp.user_id) {
                employeeMap[emp.user_id] = emp;
              }
            });
          }
        } catch (error) {
          logger.warn('Error fetching employee data for created_by:', error);
        }
      }
      
      const enriched = allHistory.map((h: any) => {
        const step = task.steps.find(s => s.id === h.task_step_id) || null;
        const sub = h.task_steps_to_steps_id ? subById[h.task_steps_to_steps_id] : null;
        const createdByEmployee = h.created_by ? employeeMap[h.created_by] : null;
        return {
          ...h,
          taskTitle: task.title,
          stepTitle: step?.title || (sub ? (task.steps.find(s => s.id === sub.parent_step_id)?.title || '-') : '-'),
          subStepTitle: sub?.title || null,
          created_by_employee: createdByEmployee ? { full_name: createdByEmployee.full_name } : null,
        };
      });
      
      setBlockerModalItems(enriched);
    } catch (error) {
      logger.error('Error in openTaskBlockers:', error);
      setBlockerModalItems([]);
    } finally {
      setLoadingBlockers(false);
    }
  }, [getVisibleSteps]);

  return {
    blockerModalOpen,
    blockerModalItems,
    loadingBlockers,
    setBlockerModalOpen,
    openTaskBlockers,
  };
};

