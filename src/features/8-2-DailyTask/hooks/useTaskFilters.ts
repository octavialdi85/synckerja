import { useMemo, useCallback } from 'react';
import { Task, TaskStep } from '../types';

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  dateFilter: string;
  dateRange?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  pic: string;
  myTask?: 'all' | 'my_task';
}

interface UseTaskFiltersProps {
  tasks: Task[];
  filters: TaskFilters;
  currentUserId?: string;
  currentEmployeeId?: string;
}

/**
 * Custom hook untuk memisahkan logika filter tasks
 * Menggunakan early exit pattern untuk optimasi performa
 */
export const useTaskFilters = ({
  tasks,
  filters,
  currentUserId,
  currentEmployeeId,
}: UseTaskFiltersProps) => {
  /**
   * Check if task should be shown in "My Task" filter
   */
  const isMyTask = useCallback(
    (task: Task): boolean => {
      if (!currentUserId && !currentEmployeeId) {
        return false;
      }

      // Task created by user
      if (task.created_by === currentUserId) {
        return true;
      }

      // Task assigned to current employee at task level
      if (task.assigned_to === currentEmployeeId) {
        return true;
      }

      // Task has step/sub-step assigned to current employee
      const hasStepAssignedToCurrentUser = task.steps?.some(
        (step) =>
          step.assigned_to === currentEmployeeId ||
          step.sub_steps?.some((subStep) => subStep.assigned_to === currentEmployeeId)
      );

      return hasStepAssignedToCurrentUser || false;
    },
    [currentUserId, currentEmployeeId]
  );

  /**
   * Check if task has step assigned to specific PIC
   */
  const hasStepAssignedToPic = useCallback(
    (task: Task, picId: string): boolean => {
      return (
        task.steps?.some((step) => step.assigned_employee?.id === picId) || false
      );
    },
    []
  );

  /**
   * Check if task matches search filter
   */
  const matchesSearch = useCallback(
    (task: Task, searchTerm: string): boolean => {
      if (!searchTerm) return true;

      const lowerSearchTerm = searchTerm.toLowerCase();
      const taskTitleMatch = task.title?.toLowerCase().includes(lowerSearchTerm) || false;
      const taskDescriptionMatch =
        task.description?.toLowerCase().includes(lowerSearchTerm) || false;
      const stepMatch =
        task.steps?.some((step) => step.title?.toLowerCase().includes(lowerSearchTerm)) ||
        false;

      return taskTitleMatch || taskDescriptionMatch || stepMatch;
    },
    []
  );

  /**
   * Check if task matches date range filter
   */
  const matchesDateRange = useCallback(
    (task: Task): boolean => {
      // If no date filter or filter is 'all', show the task
      if (!filters.dateRange || filters.dateRange === 'all') {
        return true;
      }
      
      // If task has no due_date and date filter is active, exclude it
      if (!task.due_date) {
        return false;
      }

      const taskDueDate = new Date(task.due_date);
      const now = new Date();

      switch (filters.dateRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return taskDueDate >= today && taskDueDate < tomorrow;

        case 'yesterday':
          const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const today2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return taskDueDate >= yesterday && taskDueDate < today2;

        case 'this_week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          return taskDueDate >= weekStart && taskDueDate < weekEnd;

        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          return taskDueDate >= monthStart && taskDueDate < monthEnd;

        case 'last_month':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          return taskDueDate >= lastMonthStart && taskDueDate < lastMonthEnd;

        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999);
            return taskDueDate >= startDate && taskDueDate <= endDate;
          }
          return true;

        default:
          return true;
      }
    },
    [filters.dateRange, filters.customStartDate, filters.customEndDate]
  );

  /**
   * Filter tasks dengan early exit pattern untuk optimasi
   * Perbaikan: Memastikan "All PIC" menampilkan semua tasks
   */
  const filteredTasks = useMemo(() => {
    // Defensive check: if tasks array is empty, return empty array
    if (!tasks || tasks.length === 0) {
      return [];
    }

    return tasks.filter((task) => {
      // Early exit 1: My Task filter
      // Hanya apply jika myTask === 'my_task', jika 'all' maka skip filter ini
      if (filters.myTask === 'my_task') {
        if (!isMyTask(task)) {
          return false;
        }
      }
      // Jika filters.myTask === 'all' atau undefined, skip filter ini (show all tasks)

      // Early exit 2: Search filter
      if (filters.search && !matchesSearch(task, filters.search)) {
        return false;
      }

      // Early exit 3: Status filter
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      // Early exit 4: Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Early exit 5: PIC filter
      // Hanya apply jika pic diisi, jika kosong maka skip filter ini
      if (filters.pic && !hasStepAssignedToPic(task, filters.pic)) {
        return false;
      }

      // Early exit 6: Date range filter
      // Hanya apply jika dateRange diisi dan bukan 'all'
      if (filters.dateRange && filters.dateRange !== 'all' && !matchesDateRange(task)) {
        return false;
      }

      return true;
    });
  }, [
    tasks,
    filters,
    isMyTask,
    matchesSearch,
    matchesDateRange,
    hasStepAssignedToPic,
  ]);

  /**
   * Get visible steps untuk task berdasarkan filter
   */
  const getVisibleSteps = useCallback(
    (task: Task): TaskStep[] => {
      // Defensive check: if task has no steps, return empty array
      if (!task.steps || task.steps.length === 0) {
        return [];
      }

      // Priority 1: Individual PIC filter
      if (filters.pic) {
        return task.steps.filter(
          (step) => step.assigned_employee?.id === filters.pic
        );
      }

      // Priority 2: All PIC mode - show ALL steps
      if (filters.myTask === 'all') {
        return task.steps;
      }

      // Priority 3: My Task mode
      // If task is assigned at task level to current employee, show ALL steps
      if (task.assigned_to === currentEmployeeId) {
        return task.steps;
      }

      // Otherwise, show only steps assigned to current employee or created by user or has assigned substeps
      return task.steps.filter(
        (step) =>
          step.assigned_to === currentEmployeeId ||
          step.created_by === currentUserId ||
          step.has_assigned_substeps
      );
    },
    [filters, currentEmployeeId, currentUserId]
  );

  return {
    filteredTasks,
    getVisibleSteps,
    isMyTask,
    hasStepAssignedToPic,
    matchesSearch,
    matchesDateRange,
  };
};

