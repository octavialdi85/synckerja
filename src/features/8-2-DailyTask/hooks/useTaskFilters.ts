import { useMemo, useCallback } from 'react';
import { Task, TaskStep } from '../types';
import { calculateProgress } from '../utils/taskUtils';

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

      const now = new Date();

      // Helper: determine if a given ISO date string falls within the active filter
      const isInActiveRange = (isoDate?: string | null): boolean => {
        if (!isoDate) return false;
        const date = new Date(isoDate);

        switch (filters.dateRange) {
          case 'today': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return date >= start && date < end;
          }
          case 'yesterday': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return date >= start && date < end;
          }
          case 'this_week': {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return date >= start && date < end;
          }
          case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return date >= start && date < end;
          }
          case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= start && date < end;
          }
          case 'custom': {
            if (filters.customStartDate && filters.customEndDate) {
              const start = new Date(filters.customStartDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(filters.customEndDate);
              end.setHours(23, 59, 59, 999);
              return date >= start && date <= end;
            }
            return true;
          }
          default:
            return true;
        }
      };

      // Helper: determine overdue (date in past) for task or step
      const isOverdueDate = (isoDate?: string | null): boolean => {
        if (!isoDate) return false;
        const date = new Date(isoDate);
        return date.getTime() < now.getTime();
      };

      // Match if task-level due date is in range
      if (isInActiveRange(task.due_date)) {
        return true;
      }

      // Also match if ANY step-level assigned due date is in range
      const stepHasDueInRange =
        Array.isArray(task.steps) &&
        task.steps.some((step) => isInActiveRange(step.assigned_due_date || null));

      if (stepHasDueInRange) {
        return true;
      }

      // Include overdue across ranges:
      // - Task overdue (task.due_date past) and task not completed
      if (isOverdueDate(task.due_date) && (task.status !== 'completed')) {
        return true;
      }
      // - Any step overdue (step.assigned_due_date past) and step not completed
      const hasOverdueStep =
        Array.isArray(task.steps) &&
        task.steps.some(
          (step) => isOverdueDate(step.assigned_due_date || null) && step.is_completed !== true
        );
      if (hasOverdueStep) {
        return true;
      }

      return false;
    },
    [filters.dateRange, filters.customStartDate, filters.customEndDate]
  );

  /**
   * Helper function untuk mendapatkan status priority
   * Urutan: Pending (1) > In Progress (2) > Completed (3) > Cancelled (4)
   */
  const getStatusPriority = useCallback((status: string | null | undefined): number => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 1; // Paling atas
      case 'in_progress':
        return 2; // Di tengah
      case 'completed':
        return 3; // Di bawah
      case 'cancelled':
        return 4; // Paling bawah
      default:
        return 5; // Status lain di paling bawah
    }
  }, []);

  /**
   * Helper function untuk mendapatkan progress task
   * Menggunakan calculateProgress dari utils
   */
  const getTaskProgress = useCallback((task: Task): number => {
    if (task.steps && task.steps.length > 0) {
      return calculateProgress(task.steps, task.status);
    }
    // Jika task tanpa steps, cek status
    if (task.status === 'completed') return 100;
    if (task.status === 'in_progress') return 0; // Default untuk in_progress tanpa steps
    return 0;
  }, []);

  /**
   * Helper function untuk mendapatkan completed date
   * Prioritaskan finish_date, fallback ke updated_at, lalu created_at
   */
  const getCompletedDate = useCallback((task: Task): Date | null => {
    // Prioritaskan finish_date
    if (task.finish_date) {
      return new Date(task.finish_date);
    }
    // Fallback ke updated_at jika finish_date null
    if (task.updated_at) {
      return new Date(task.updated_at);
    }
    // Fallback terakhir ke created_at
    if (task.created_at) {
      return new Date(task.created_at);
    }
    return null;
  }, []);

  /**
   * Filter tasks dengan early exit pattern untuk optimasi
   * Perbaikan: Memastikan "All PIC" menampilkan semua tasks
   * Ditambahkan: Auto-sorting berdasarkan status dan sub-criteria
   */
  const filteredTasks = useMemo(() => {
    // Defensive check: if tasks array is empty, return empty array
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const filtered = tasks.filter((task) => {
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

    // Tambahkan sorting setelah filtering
    return filtered.sort((a, b) => {
      // 1. Sort berdasarkan status priority
      const statusPriorityA = getStatusPriority(a.status);
      const statusPriorityB = getStatusPriority(b.status);
      
      if (statusPriorityA !== statusPriorityB) {
        return statusPriorityA - statusPriorityB;
      }

      // 2. Jika status sama, sort berdasarkan sub-criteria
      const statusA = a.status?.toLowerCase();
      const statusB = b.status?.toLowerCase();

      // Pending: sort berdasarkan due_date (null di akhir)
      if (statusA === 'pending' && statusB === 'pending') {
        const dueDateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dueDateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dueDateA - dueDateB; // Due date terdekat di atas
      }

      // In Progress: sort berdasarkan progress (rendah → tinggi)
      if (statusA === 'in_progress' && statusB === 'in_progress') {
        const progressA = getTaskProgress(a);
        const progressB = getTaskProgress(b);
        return progressA - progressB; // Progress rendah di atas
      }

      // Completed: sort berdasarkan finish_date (baru → lama)
      if (statusA === 'completed' && statusB === 'completed') {
        const completedDateA = getCompletedDate(a);
        const completedDateB = getCompletedDate(b);
        
        if (!completedDateA && !completedDateB) return 0;
        if (!completedDateA) return 1; // Null di bawah
        if (!completedDateB) return -1; // Null di bawah
        
        // Terbaru di atas (descending)
        return completedDateB.getTime() - completedDateA.getTime();
      }

      // Cancelled: sort berdasarkan updated_at (baru → lama)
      if (statusA === 'cancelled' && statusB === 'cancelled') {
        const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return updatedB - updatedA; // Terbaru di atas
      }

      // Default: maintain current order
      return 0;
    });
  }, [
    tasks,
    filters,
    isMyTask,
    matchesSearch,
    matchesDateRange,
    hasStepAssignedToPic,
    getStatusPriority,
    getTaskProgress,
    getCompletedDate,
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

      // Helper: check if a given ISO date is within the active filter range
      const isInActiveRange = (isoDate?: string | null): boolean => {
        if (!filters.dateRange || filters.dateRange === 'all') return true;
        if (!isoDate) return false;
        const now = new Date();
        const date = new Date(isoDate);
        switch (filters.dateRange) {
          case 'today': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return date >= start && date < end;
          }
          case 'yesterday': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return date >= start && date < end;
          }
          case 'this_week': {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return date >= start && date < end;
          }
          case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return date >= start && date < end;
          }
          case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= start && date < end;
          }
          case 'custom': {
            if (filters.customStartDate && filters.customEndDate) {
              const start = new Date(filters.customStartDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(filters.customEndDate);
              end.setHours(23, 59, 59, 999);
              return date >= start && date <= end;
            }
            return true;
          }
          default:
            return true;
        }
      };

      // Priority 1: Individual PIC filter
      let steps = task.steps;
      if (filters.pic) {
        steps = steps.filter(
          (step) => step.assigned_employee?.id === filters.pic
        );
      }

      // Priority 2: All PIC mode - keep current filtered list

      // Priority 3: My Task mode
      // If task is assigned at task level to current employee, show ALL steps
      if (task.assigned_to === currentEmployeeId) {
        // keep steps as-is
      } else {
        // Otherwise, show only steps assigned to current employee or created by user or has assigned substeps
        steps = steps.filter(
          (step) =>
            step.assigned_to === currentEmployeeId ||
            step.created_by === currentUserId ||
            step.has_assigned_substeps
        );
      }

      // Apply date range filter at step level:
      // When a date filter is active, show steps whose assigned_due_date falls in range
      // OR steps that are overdue (assigned_due_date in past) and not completed
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        const isOverdue = (step: TaskStep): boolean => {
          if (!step.assigned_due_date) return false;
          const due = new Date(step.assigned_due_date);
          // consider overdue if due date has passed and step not completed
          return due.getTime() < now.getTime() && step.is_completed !== true;
        };
        steps = steps.filter((step) => {
          const inRange = isInActiveRange(step.assigned_due_date || null);
          return inRange || isOverdue(step);
        });
      }

      // Apply search filter at step level:
      // - Exact match with task title => show all steps
      // - Exact match with step title => show only matching steps
      // - Partial match => keep previous behavior (step titles containing keyword)
      if (filters.search) {
        const normalizedSearch = filters.search.toLowerCase().trim();
        const normalizedTaskTitle = task.title?.toLowerCase().trim() || '';
        const isExactTaskMatch = normalizedSearch.length > 0 && normalizedTaskTitle === normalizedSearch;

        if (!isExactTaskMatch) {
          const exactStepMatches = steps.filter((step) => {
            const normalizedStepTitle = step.title?.toLowerCase().trim() || '';
            return normalizedStepTitle === normalizedSearch;
          });

          if (exactStepMatches.length > 0) {
            steps = exactStepMatches;
          } else {
            steps = steps.filter((step) => {
              const stepTitleMatch = step.title?.toLowerCase().includes(normalizedSearch) || false;
              return stepTitleMatch;
            });
          }
        }
      }

      return steps;
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

