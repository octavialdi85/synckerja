import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckSquare,
  Flag,
  History,
  Paperclip,
  Plus,
  Square,
  Target,
  Trash2,
  User,
  Calendar,
  Clock3,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/features/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/features/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/features/ui/popover';
import { CustomDatePicker } from '@/features/share/calendar';
import { useDailyTask, type Task, type TaskStep as TaskStepEntity } from '@/features/8-2-DailyTask/DailyTaskContext';
import { supabase } from '@/integrations/supabase/client';
import { BlockerDetailsModal } from '@/features/8-2-DailyTaskReport/components/BlockerDetailsModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';
import { Dialog, DialogContent } from '@/features/ui/dialog';
import { TaskStep as TaskStepItem } from '@/features/8-2-DailyTask/section/TaskStep';
import { DeadlineExtensionDialog } from '@/features/8-2-DailyTask/section/DeadlineExtensionDialog';
import { DeadlineHistoryDialog } from '@/features/8-2-DailyTask/section/DeadlineHistoryDialog';
import { EditTaskDialog } from '@/features/8-2-DailyTask/section/EditTaskDialog';
import { CreateTaskDialog } from '@/features/8-2-DailyTask/section/CreateTaskDialog';
import { ModalAddTaskStep } from '@/features/8-2-DailyTask/section/ModalAddTaskStep';
import '@/features/8-2-DailyTask/section/TaskList.css';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useToast } from '@/features/ui/use-toast';

const supabaseClient = supabase as any;

interface DeadlineHistory {
  id: string;
  task_id: string;
  original_deadline: string;
  new_deadline: string;
  reason: string | null;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const TaskList = () => {
  const context = useDailyTask();
  const { tasks, filters, updateTask, deleteTask, addTaskStep, reorderTaskSteps, highlightedTask } = context;
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployee();
  const { toast } = useToast();

  const currentUserId = user?.id ?? undefined;
  const currentEmployeeId =
    currentEmployee && typeof (currentEmployee as any).id === 'string'
      ? ((currentEmployee as any).id as string)
      : undefined;

  const isMyTask = useCallback(
    (task: Task): boolean => {
      if (!currentUserId && !currentEmployeeId) return false;
      if (task.created_by === currentUserId) return true;
      if (task.assigned_to === currentEmployeeId) return true;

      return (
        task.steps?.some(
          (step) =>
            step.assigned_to === currentEmployeeId ||
            step.sub_steps?.some((subStep) => subStep.assigned_to === currentEmployeeId)
        ) || false
      );
    },
    [currentEmployeeId, currentUserId]
  );

  const hasStepAssignedToPic = useCallback((task: Task, picId: string): boolean => {
    return task.steps?.some((step) => step.assigned_employee?.id === picId) || false;
  }, []);

  const matchesSearch = useCallback((task: Task, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    const titleMatch = task.title?.toLowerCase().includes(lower) || false;
    const descMatch = task.description?.toLowerCase().includes(lower) || false;
    const stepMatch =
      task.steps?.some((step) => step.title?.toLowerCase().includes(lower)) || false;
    return titleMatch || descMatch || stepMatch;
  }, []);

  const matchesDateRange = useCallback(
    (task: Task): boolean => {
      if (!filters.dateRange || filters.dateRange === 'all') {
        return true;
      }

      if (!task.due_date) {
        return false;
      }

      const taskDueDate = new Date(task.due_date);
      const now = new Date();

      switch (filters.dateRange) {
        case 'today': {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return taskDueDate >= today && taskDueDate < tomorrow;
        }
        case 'yesterday': {
          const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return taskDueDate >= yesterday && taskDueDate < today;
        }
        case 'this_week': {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          return taskDueDate >= weekStart && taskDueDate < weekEnd;
        }
        case 'this_month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          return taskDueDate >= monthStart && taskDueDate < monthEnd;
        }
        case 'last_month': {
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          return taskDueDate >= lastMonthStart && taskDueDate < lastMonthEnd;
        }
        case 'custom': {
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999);
            return taskDueDate >= startDate && taskDueDate <= endDate;
          }
          return true;
        }
        default:
          return true;
      }
    },
    [filters.customEndDate, filters.customStartDate, filters.dateRange]
  );

  const filteredTasks = useMemo<Task[]>(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    return tasks.filter((task) => {
      if (filters.myTask === 'my_task' && !isMyTask(task)) {
        return false;
      }

      if (filters.search && !matchesSearch(task, filters.search)) {
        return false;
      }

      if (filters.status && task.status !== filters.status) {
        return false;
      }

      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      if (filters.pic && !hasStepAssignedToPic(task, filters.pic)) {
        return false;
      }

      if (filters.dateRange && filters.dateRange !== 'all' && !matchesDateRange(task)) {
        return false;
      }

      return true;
    });
  }, [
    filters.dateRange,
    filters.myTask,
    filters.pic,
    filters.priority,
    filters.search,
    filters.status,
    hasStepAssignedToPic,
    isMyTask,
    matchesDateRange,
    matchesSearch,
    tasks,
  ]);

  const getVisibleSteps = useCallback(
    (task: Task): TaskStepEntity[] => {
      if (!task.steps || task.steps.length === 0) {
        return [];
      }

      if (filters.pic) {
        return task.steps.filter((step) => step.assigned_employee?.id === filters.pic);
      }

      if (filters.myTask === 'all') {
        return task.steps;
      }

      if (task.assigned_to === currentEmployeeId) {
        return task.steps;
      }

      return task.steps.filter(
        (step) =>
          step.assigned_to === currentEmployeeId ||
          step.created_by === currentUserId ||
          step.has_assigned_substeps
      );
    },
    [currentEmployeeId, currentUserId, filters.myTask, filters.pic]
  );
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [reminderPendingTaskId, setReminderPendingTaskId] = useState<string | null>(null);
  const [deadlineDialog, setDeadlineDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [addStepDialog, setAddStepDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [blockerCountByTask, setBlockerCountByTask] = useState<Record<string, number>>({});
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalItems, setBlockerModalItems] = useState<any[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((task) => task.id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  const activeVisibleSteps = useMemo(() => {
    if (!activeTask) return [] as TaskStepEntity[];
    return getVisibleSteps(activeTask);
  }, [activeTask, getVisibleSteps]);

  const calculateAssignedStepsProgress = (task: Task): number => {
    const visibleSteps = getVisibleSteps(task);
    if (visibleSteps.length === 0) return 0;
    const completedVisibleSteps = visibleSteps.filter((step) => step.is_completed).length;
    return Math.round((completedVisibleSteps / visibleSteps.length) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysRemaining = (dueDate: string | null, status: string): number | null => {
    if (!dueDate || status === 'completed') return null;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueDate));
    return differenceInDays(due, today);
  };

  const formatDaysRemaining = (days: number | null): string => {
    if (days === null) return '';
    if (days < 0) return `${Math.abs(days)} hari lalu`;
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Besok';
    return `${days} hari lagi`;
  };

  const activeProgress = useMemo(() => {
    if (!activeTask) return 0;
    return calculateAssignedStepsProgress(activeTask);
  }, [activeTask]);

  const activeIsOverdue = useMemo(() => {
    if (!activeTask) return false;
    return isOverdue(activeTask.due_date, activeTask.status);
  }, [activeTask]);

  const activeDaysRemaining = useMemo(() => {
    if (!activeTask) return null;
    return getDaysRemaining(activeTask.due_date, activeTask.status);
  }, [activeTask]);

  const activeBlockerCount = useMemo(() => {
    if (!activeTask) return 0;
    return blockerCountByTask[activeTask.id] || 0;
  }, [activeTask, blockerCountByTask]);

  // Auto-scroll to highlighted task
  useEffect(() => {
    if (highlightedTask && taskRefs.current[highlightedTask] && scrollContainerRef.current) {
      const taskElement = taskRefs.current[highlightedTask];
      const scrollContainer = scrollContainerRef.current;
      
      if (taskElement) {
        // Add a small delay to ensure the DOM has updated
        setTimeout(() => {
          const taskRect = taskElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          
          // Check if task is visible in the container
          const isVisible = taskRect.top >= containerRect.top && 
                           taskRect.bottom <= containerRect.bottom;
          
          if (!isVisible) {
            // Calculate scroll position to center the task
            const scrollTop = scrollContainer.scrollTop + 
                            (taskRect.top - containerRect.top) - 
                            (containerRect.height / 2) + 
                            (taskRect.height / 2);
            
            scrollContainer.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }, 150);
      }
    }
  }, [highlightedTask]);
  
  // getVisibleSteps now comes from useTaskFilters hook

  const openTaskBlockers = async (task: Task) => {
    // OPTIMIZATION: Open modal immediately with loading state
    setBlockerModalItems([]);
    setBlockerModalOpen(true);

    try {
      // Use getVisibleSteps from hook to show steps based on filters
      const visibleSteps = getVisibleSteps(task);
      const stepIds = visibleSteps.map(s => s.id);
      
      // OPTIMIZATION: Fetch sub-steps
      const subStepsResult: any = stepIds.length > 0
        ? await supabaseClient
            .from('task_steps_to_steps')
            .select('id, title, parent_step_id')
            .in('parent_step_id', stepIds)
        : { data: [], error: null };

      // Fetch history for steps with timeout
      let stepHistoryResult: any = { data: [], error: null };
      if (stepIds.length > 0) {
        stepHistoryResult = await supabaseClient
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
      let subStepHistoryResult: any = { data: [], error: null };
      if (subIds.length > 0) {
        subStepHistoryResult = await supabaseClient
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
          const { data: employeesData, error: employeesError } = await supabaseClient
            .from('employees')
            .select('id, full_name, user_id')
            .in('user_id', createdByUserIds);
          
          if (!employeesError && employeesData) {
            employeesData.forEach((emp: any) => {
              if (emp.user_id) {
                employeeMap[emp.user_id] = emp;
              }
            });
          }
        } catch (error) {
          console.warn('Error fetching employee data for created_by:', error);
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
      console.error('Error in openTaskBlockers:', error);
      setBlockerModalItems([]);
    }
  };


  // filteredTasks and getVisibleSteps now come from useTaskFilters hook

  // Compute blocker counts per task to mirror report page
  // Create stable string of task IDs and step counts to use as dependency
  const blockerCalculationKey = useMemo(() => {
    if (filteredTasks.length === 0) return '';
    return filteredTasks
      .map(t => `${t.id}:${t.steps.length}`)
      .sort()
      .join('|');
  }, [filteredTasks]);
  
  // Store snapshot of filteredTasks when blockerCalculationKey changes
  const filteredTasksSnapshotRef = useRef(filteredTasks);
  useEffect(() => {
    filteredTasksSnapshotRef.current = filteredTasks;
  }, [blockerCalculationKey, filteredTasks]);
  
  useEffect(() => {
    // Prevent running if no tasks
    if (!blockerCalculationKey) {
      setBlockerCountByTask({});
      return;
    }

    let cancelled = false;
    
    const loadCounts = async () => {
      try {
        // Use snapshot from ref to avoid closure issues
        const tasksToProcess = filteredTasksSnapshotRef.current;
        
        // OPTIMIZATION: Skip blocker counting entirely if DB is overloaded
        // This is a non-critical feature that can degrade gracefully
        if (tasksToProcess.length === 0) {
          setBlockerCountByTask({});
          return;
        }

        // Collect ALL step IDs from ALL tasks at once
        const allStepIds: string[] = [];
        const taskToStepMapping: Record<string, string[]> = {};
        
        tasksToProcess.forEach(t => {
          const stepIds = t.steps.map(s => s.id);
          taskToStepMapping[t.id] = stepIds;
          allStepIds.push(...stepIds);
        });

        if (allStepIds.length === 0) {
          setBlockerCountByTask({});
          return;
        }

        // SINGLE BATCHED QUERY #1: Get all sub-steps for all tasks at once
        let allSubSteps: any[] = [];
        try {
          const { data, error } = await supabaseClient
            .from('task_steps_to_steps')
            .select('id, parent_step_id')
            .in('parent_step_id', allStepIds);
          
          if (!error && data) {
            allSubSteps = data;
          }
        } catch (err) {
          console.warn('Failed to fetch sub-steps:', err);
          // Continue with empty sub-steps
        }

        if (cancelled) return;

        const allSubStepIds = allSubSteps.map(s => s.id);
        
        // SINGLE BATCHED QUERY #2: Get ALL blocker counts for ALL steps at once (only unresolved)
        let stepBlockers: any[] = [];
        try {
          const { data, error } = await supabaseClient
            .from('task_step_history')
            .select('task_step_id, is_resolved')
            .eq('action_type', 'blocker_added')
            .in('task_step_id', allStepIds);
          
          if (!error && data) {
            // Filter for unresolved blockers in JavaScript to avoid 500 errors
            stepBlockers = data.filter((b: any) => b.is_resolved === null || b.is_resolved === false);
          }
        } catch (err) {
          console.warn('Failed to count step blockers:', err);
          // Continue with empty blockers - graceful degradation
        }

        if (cancelled) return;

        // SINGLE BATCHED QUERY #3: Get ALL blocker counts for ALL sub-steps at once (only unresolved)
        let subStepBlockers: any[] = [];
        if (allSubStepIds.length > 0) {
          try {
            const { data, error } = await supabaseClient
              .from('task_step_history')
              .select('task_steps_to_steps_id, is_resolved')
              .eq('action_type', 'blocker_added')
              .in('task_steps_to_steps_id', allSubStepIds);
            
            if (!error && data) {
              // Filter for unresolved blockers in JavaScript to avoid 500 errors
              subStepBlockers = data.filter((b: any) => b.is_resolved === null || b.is_resolved === false);
            }
          } catch (err) {
            console.warn('Failed to count sub-step blockers:', err);
            // Continue with empty blockers - graceful degradation
          }
        }

        if (cancelled) return;

        // Map sub-steps to their parent steps
        const subStepToParent: Record<string, string> = {};
        allSubSteps.forEach(sub => {
          subStepToParent[sub.id] = sub.parent_step_id;
        });

        // Count blockers per task
        const counts: Record<string, number> = {};
        tasksToProcess.forEach(task => {
          const taskStepIds = taskToStepMapping[task.id];
          let count = 0;

          // Count step blockers
          stepBlockers.forEach(blocker => {
            if (taskStepIds.includes(blocker.task_step_id)) {
              count++;
            }
          });

          // Count sub-step blockers
          subStepBlockers.forEach(blocker => {
            const parentStepId = subStepToParent[blocker.task_steps_to_steps_id];
            if (parentStepId && taskStepIds.includes(parentStepId)) {
              count++;
            }
          });

          counts[task.id] = count;
        });
        
        // Only update state if not cancelled
        if (!cancelled) {
          setBlockerCountByTask(counts);
        }
      } catch (e) {
        console.warn('Error loading blocker counts:', e);
        // Graceful degradation: Show tasks without blocker counts
        setBlockerCountByTask({});
      }
    };
    
    // Debounce the loading to reduce query spam
    const timeoutId = setTimeout(loadCounts, 300);
    
    // Cleanup function to cancel if component unmounts or dependencies change
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [blockerCalculationKey]); // Only depend on blockerCalculationKey

  // Check if current user is the creator of the task
  const isTaskCreator = (task: Task): boolean => {
    return task.created_by === user?.id;
  };

  // Calculate progress only for visible steps (assigned OR created by user OR has assigned substeps)
  // When PIC filter is active, calculate progress for steps assigned to that PIC
  // When All PIC is selected, calculate progress for ALL steps
  // When task is assigned at task level, calculate progress for ALL steps
  const handleStatusToggle = (task: Task) => {
    // If task has no substeps (has_substeps = FALSE), allow direct toggle
    if (task.has_substeps === false) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      if (newStatus !== task.status) {
        // Show notification
        toast({
          title: newStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
          description: `"${task.title}" has been ${newStatus === 'completed' ? 'marked as completed' : 'reopened'}`,
        });
        // Fire and forget - optimistic update will handle UI immediately
        updateTask(task.id, { status: newStatus }).catch(err => {
          console.error('Error updating task status:', err);
          toast({
            title: 'Error',
            description: 'Failed to update task status',
            variant: 'destructive',
          });
        });
      }
      return;
    }
    
    // If task has substeps, require all steps to be completed first
    const assignedProgress = calculateAssignedStepsProgress(task);
    const visibleSteps = getVisibleSteps(task);
    const isFullComplete = visibleSteps.length > 0 && assignedProgress === 100;
    const newStatus = isFullComplete ? (task.status === 'completed' ? 'pending' : 'completed') : 'pending';
    if (newStatus !== task.status) {
      // Show notification
      toast({
        title: newStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
        description: `"${task.title}" has been ${newStatus === 'completed' ? 'marked as completed' : 'reopened'}`,
      });
      // Fire and forget - optimistic update will handle UI immediately
      updateTask(task.id, { status: newStatus }).catch(err => {
        console.error('Error updating task status:', err);
        toast({
          title: 'Error',
          description: 'Failed to update task status',
          variant: 'destructive',
        });
      });
    } else if (!isFullComplete && task.status !== 'completed') {
      // Show notification if user tries to complete task but steps are not done
      // Only show if task is not already completed or cancelled
      toast({
        title: 'Cannot Complete Task',
        description: 'Please complete all assigned steps first',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const label = status.replace('_', ' ').toUpperCase();
    return <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    return <span className="text-[11px] font-semibold text-muted-foreground">{priority.toUpperCase()}</span>;
  };

  const handleDateChange = async (taskId: string, date: Date) => {
    const updateData: Partial<Task> = { due_date: format(date, 'yyyy-MM-dd') };
    
    // Jika date picker dibuka karena user klik reminder, aktifkan reminder juga
    if (reminderPendingTaskId === taskId) {
      updateData.has_reminder = true;
      setReminderPendingTaskId(null);
    }
    
    await updateTask(taskId, updateData);
    setDatePickerOpen(null);
  };

  const handleClearDate = async (taskId: string) => {
    await updateTask(taskId, { due_date: null });
    setDatePickerOpen(null);
  };

  const handlePriorityChange = async (taskId: string, newPriority: Task['priority']) => {
    await updateTask(taskId, { priority: newPriority });
  };

  const handleDeleteClick = (task: Task) => {
    setDeleteDialog({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.taskId) {
      await deleteTask(deleteDialog.taskId);
      setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
  };

  const handleToggleReminder = async (task: Task) => {
    const currentValue = task.has_reminder ?? false;
    const newReminderValue = !currentValue;
    
    // Jika ingin mengaktifkan reminder tapi belum ada due_date, buka date picker dulu
    if (newReminderValue && !task.due_date) {
      setReminderPendingTaskId(task.id);
      setDatePickerOpen(task.id);
      return;
    }
    
    await updateTask(task.id, { has_reminder: newReminderValue });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // Extract step IDs from the drag event
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if we're reordering steps within a task
    if (activeId.startsWith('step-') && overId.startsWith('step-')) {
      const activeStepId = activeId.replace('step-', '');
      const overStepId = overId.replace('step-', '');
      
      // Find the task that contains these steps
      const task = tasks.find(t => 
        t.steps.some(s => s.id === activeStepId) && 
        t.steps.some(s => s.id === overStepId)
      );
      
      if (task) {
        // Get the steps in their current order
        const sortedSteps = task.steps.sort((a, b) => a.order - b.order);
        const activeIndex = sortedSteps.findIndex(s => s.id === activeStepId);
        const overIndex = sortedSteps.findIndex(s => s.id === overStepId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          // Create new order array
          const newSteps = [...sortedSteps];
          const [removed] = newSteps.splice(activeIndex, 1);
          newSteps.splice(overIndex, 0, removed);
          
          // Extract step IDs in new order
          const stepIds = newSteps.map(step => step.id);
          
          // Call reorder function
          reorderTaskSteps(task.id, stepIds);
        }
      }
    }
  };

  const openTaskModal = (taskId: string) => {
    setActiveTaskId(taskId);
  };

  const closeTaskModal = () => {
    setActiveTaskId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col min-h-0 mobile-task-list">
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <TooltipProvider>
          <div className="h-full flex flex-col min-h-0">
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="space-y-3 py-2">
                {filteredTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                    <CheckSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="font-medium text-foreground">No tasks found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create your first task to get started
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
        const isOverdueTask = isOverdue(task.due_date, task.status);
        const isHighlighted = highlightedTask === task.id;
        const visibleSteps = getVisibleSteps(task);
        const progress = calculateAssignedStepsProgress(task);

        return (
                    <React.Fragment key={task.id}>
                      <div
                        ref={(el) => {
                          taskRefs.current[task.id] = el;
                        }}
                        className={`flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm transition-all duration-300 ${
                          isHighlighted ? 'bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusToggle(task);
                            }}
                            className="mt-1 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            title={
                              task.has_substeps === false
                                ? task.status === 'completed'
                                  ? 'Mark incomplete'
                                  : 'Mark complete'
                                : progress === 100
                                ? 'Mark complete / reopen'
                                : 'Complete all assigned steps to mark task complete'
                            }
                          >
                            {(() => {
                              if (task.has_substeps === false) {
                                return task.status === 'completed' ? (
                                  <CheckSquare className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                );
                              }
                              return progress === 100 ? (
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              );
                            })()}
                          </button>

                          <div
                            className="flex-1 min-w-0 space-y-2 cursor-pointer"
                            onClick={() => openTaskModal(task.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`flex-1 min-w-0 truncate text-left text-[13px] font-semibold leading-5 transition-colors ${
                                      (task.has_substeps === false && task.status === 'completed') ||
                                      (task.has_substeps !== false && progress === 100)
                                        ? 'text-muted-foreground line-through'
                                        : 'text-foreground hover:text-primary'
                                    }`}
                                  >
                                    <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                                      {isHighlighted && (
                                        <Target className="h-4 w-4 text-primary animate-pulse" />
                                      )}
                                      <span className="truncate">{task.title}</span>
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  align="start"
                                  className="max-w-md border border-slate-700 bg-slate-900 p-4 text-white shadow-lg"
                                >
                                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-300">
                                      {task.description}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {progress}%
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CheckSquare className="h-3.5 w-3.5" />
                                {visibleSteps.filter((s) => s.is_completed).length}/{visibleSteps.length}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-foreground">
                                    <User className="h-3.5 w-3.5 text-blue-500" />
                                    {task.assigned_to_name ? (
                                      <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                                        {task.assigned_to_name}
                                      </span>
                                    ) : (
                                      <span className="italic text-muted-foreground">Unassigned</span>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                {task.assigned_to_name && (
                                  <TooltipContent>
                                    <span>{task.assigned_to_name}</span>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              {task.due_date && (
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    isOverdueTask ? 'text-destructive' : 'text-muted-foreground'
                                  }`}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                              <div className="ml-auto flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReminder(task);
                                  }}
                                  className={`h-6 w-6 p-0 ${
                                    task.has_reminder ?? false
                                      ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                  }`}
                                  title={
                                    task.has_reminder ?? false
                                      ? 'Pengingat aktif'
                                      : task.due_date
                                      ? 'Aktifkan pengingat'
                                      : 'Set due date terlebih dahulu untuk mengaktifkan pengingat'
                                  }
                                >
                                  <Bell
                                    className={`h-3.5 w-3.5 ${
                                      task.has_reminder ?? false ? 'fill-current' : ''
                                    }`}
                                  />
                                </Button>

                                {blockerCountByTask?.[task.id] && blockerCountByTask[task.id] > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTaskBlockers(task);
                                    }}
                                    className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                    title="View blockers"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </Button>
                                )}

                                {task.due_date && task.status !== 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeadlineDialog({ isOpen: true, taskId: task.id });
                                    }}
                                    className="h-6 w-6 p-0 text-gray-400 hover:bg-orange-50 hover:text-orange-600"
                                    title="Request deadline extension"
                                  >
                                    <Clock3 className="h-3 w-3" />
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    isTaskCreator(task) && setEditingTask(task.id);
                                  }}
                                  disabled={!isTaskCreator(task)}
                                  className={`h-6 w-6 p-0 ${
                                    isTaskCreator(task)
                                      ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-600'
                                      : 'opacity-40 cursor-not-allowed'
                                  }`}
                                  title={isTaskCreator(task) ? 'Edit task' : '🔒 Only task creator can edit'}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isTaskCreator(task)) {
                                      handleDeleteClick(task);
                                    }
                                  }}
                                  disabled={!isTaskCreator(task)}
                                  className={`h-6 w-6 p-0 ${
                                    isTaskCreator(task)
                                      ? 'cursor-pointer hover:bg-red-50 hover:text-red-600'
                                      : 'opacity-40 cursor-not-allowed'
                                  }`}
                                  title={isTaskCreator(task) ? 'Delete task' : '🔒 Only task creator can delete'}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
                )}
              </div>
            </div>

        {/* Deadline Extension Dialog */}
        <DeadlineExtensionDialog
          isOpen={deadlineDialog.isOpen}
          onClose={() => setDeadlineDialog({ isOpen: false, taskId: null })}
          taskId={deadlineDialog.taskId}
          currentDeadline={deadlineDialog.taskId ? tasks.find(t => t.id === deadlineDialog.taskId)?.due_date || null : null}
          onRequestExtension={requestDeadlineExtension}
        />

        {/* Deadline History Dialog */}
        <DeadlineHistoryDialog
          isOpen={historyDialog.isOpen}
          onClose={() => setHistoryDialog({ isOpen: false, taskId: null })}
          taskId={historyDialog.taskId}
          deadlineHistory={historyDialog.taskId ? tasks.find(t => t.id === historyDialog.taskId)?.deadline_history || [] : []}
        />

        {/* Edit Task Dialog */}
        <EditTaskDialog
          isOpen={editingTask !== null}
          onClose={() => setEditingTask(null)}
          taskId={editingTask}
        />

        {/* Add Step Modal */}
        {addStepDialog.taskId && (
          <ModalAddTaskStep
            open={addStepDialog.isOpen}
            onOpenChange={(open) => setAddStepDialog({ isOpen: open, taskId: null, taskTitle: '' })}
            taskId={addStepDialog.taskId}
            taskTitle={addStepDialog.taskTitle}
            onSuccess={() => {
              // Optionally refresh or do something after success
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog.isOpen} onOpenChange={handleCancelDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Task
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Are you sure you want to delete this task?
                  </div>
                  {deleteDialog.taskTitle && (
                    <div className="font-semibold text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                      "{deleteDialog.taskTitle}"
                    </div>
                  )}
                  <div className="text-red-600 font-medium text-sm">
                    This action cannot be undone. This will permanently delete the task and all its associated data including steps, files, and history.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>

        <BlockerDetailsModal
          open={blockerModalOpen}
          onOpenChange={setBlockerModalOpen}
          items={blockerModalItems}
          initialTab={'list'}
        />

        {activeTask && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) {
                closeTaskModal();
              }
            }}
          >
            <DialogContent className="max-w-md w-full border-none bg-card p-0 shadow-xl focus:outline-none flex flex-col h-[100vh] max-h-[100vh] sm:h-auto sm:max-h-[85vh]">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="rounded-md p-1 hover:bg-muted"
                  aria-label="Close task details"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground">{activeTask.title}</span>
                  <span className="text-xs text-muted-foreground">{activeProgress}% complete</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {activeTask.description && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</span>
                    <p className="rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground">
                      {activeTask.description}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Progress</span>
                    <span className="text-xs font-semibold text-muted-foreground">{activeProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeProgress === 100 ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${activeProgress}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {activeVisibleSteps.filter((s) => s.is_completed).length}/{activeVisibleSteps.length}
                    </span>
                    {activeTask.files.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {activeTask.files.length} files
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12px] text-muted-foreground sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PIC</span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      {activeTask.assigned_to_name ? activeTask.assigned_to_name : <span className="italic text-muted-foreground">Unassigned</span>}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</span>
                    {activeTask.due_date ? (
                      <div className="text-foreground">
                        <span className="block font-medium text-sm">{formatDate(activeTask.due_date)}</span>
                        <span className={`text-xs ${activeIsOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {formatDaysRemaining(activeDaysRemaining)}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-muted-foreground">No due date</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          disabled={!isTaskCreator(activeTask)}
                          className={`h-auto justify-start gap-2 rounded-md px-2 py-1 text-left ${
                            isTaskCreator(activeTask) ? 'hover:bg-muted text-foreground' : 'cursor-not-allowed opacity-60'
                          }`}
                        >
                          {getPriorityBadge(activeTask.priority)}
                        </Button>
                      </DropdownMenuTrigger>
                      {isTaskCreator(activeTask) && (
                        <DropdownMenuContent align="start" className="w-32">
                          <DropdownMenuItem onClick={() => handlePriorityChange(activeTask.id, 'low')} className="flex items-center gap-2">
                            <Flag className="w-3 h-3 text-green-600" />
                            <span className="text-green-700">Low</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange(activeTask.id, 'medium')} className="flex items-center gap-2">
                            <Flag className="w-3 h-3 text-blue-600" />
                            <span className="text-blue-700">Medium</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange(activeTask.id, 'high')} className="flex items-center gap-2">
                            <Flag className="w-3 h-3 text-orange-600" />
                            <span className="text-orange-700">High</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange(activeTask.id, 'urgent')} className="flex items-center gap-2">
                            <Flag className="w-3 h-3 text-red-600" />
                            <span className="text-red-700">Urgent</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                    <div>{getStatusBadge(activeTask.status)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleReminder(activeTask)}
                    className={`h-7 w-7 p-0 ${
                      (activeTask.has_reminder ?? false)
                        ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                    title={
                      (activeTask.has_reminder ?? false)
                        ? 'Pengingat aktif'
                        : activeTask.due_date
                        ? 'Aktifkan pengingat'
                        : 'Set due date terlebih dahulu untuk mengaktifkan pengingat'
                    }
                  >
                    <Bell className={`w-3 h-3 ${(activeTask.has_reminder ?? false) ? 'fill-current' : ''}`} />
                  </Button>

                  {activeBlockerCount > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openTaskBlockers(activeTask)}
                      className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      title="View blockers"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </Button>
                  )}

                  {activeTask.deadline_history && activeTask.deadline_history.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistoryDialog({ isOpen: true, taskId: activeTask.id })}
                      className="h-7 w-7 p-0 hover:bg-gray-50 hover:text-gray-600"
                      title="View deadline history"
                    >
                      <History className="w-3 h-3" />
                    </Button>
                  )}

                  {activeTask.status !== 'completed' && activeTask.due_date && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeadlineDialog({ isOpen: true, taskId: activeTask.id })}
                      className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600"
                      title="Request deadline extension"
                    >
                      <Clock3 className="w-3 h-3" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => isTaskCreator(activeTask) && setEditingTask(activeTask.id)}
                    disabled={!isTaskCreator(activeTask)}
                    className={`h-7 w-7 p-0 ${
                      isTaskCreator(activeTask)
                        ? 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                    title={isTaskCreator(activeTask) ? 'Edit task' : '🔒 Only task creator can edit'}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isTaskCreator(activeTask)) {
                        handleDeleteClick(activeTask);
                      }
                    }}
                    disabled={!isTaskCreator(activeTask)}
                    className={`h-7 w-7 p-0 ${
                      isTaskCreator(activeTask)
                        ? 'hover:bg-red-50 hover:text-red-600 cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                    title={isTaskCreator(activeTask) ? 'Delete task' : '🔒 Only task creator can delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      Steps ({activeVisibleSteps.filter((s) => s.is_completed).length}/{activeVisibleSteps.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isTaskCreator(activeTask)) {
                          setAddStepDialog({ isOpen: true, taskId: activeTask.id, taskTitle: activeTask.title });
                        }
                      }}
                      disabled={!isTaskCreator(activeTask)}
                      className={`${
                        isTaskCreator(activeTask)
                          ? 'text-primary hover:text-primary/80'
                          : 'text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>

                  <SortableContext items={(activeTask.steps ?? []).map((step) => `step-${step.id}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {activeVisibleSteps.length === 0 ? (
                        <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                          No steps yet
                        </div>
                      ) : (
                        activeVisibleSteps
                          .sort((a, b) => a.order - b.order)
                          .map((step, index) => (
                            <TaskStepItem key={step.id} step={step as any} index={index} taskCreatedBy={activeTask.created_by} />
                          ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </TooltipProvider>
    </DndContext>
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex justify-end px-6">
        <Button
          onClick={() => setIsCreateTaskDialogOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <CreateTaskDialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen} />
  </div>
  );
};
