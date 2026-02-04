import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  Flag, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  History,
  Clock3,
  Paperclip,
  Target,
  Bell,
  Building2
} from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
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
import { useDailyTask } from '../DailyTaskContext';
import { type Task } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { BlockerDetailsModal } from '@/features/8-2-DailyTaskReport/components/BlockerDetailsModal';
import { logger } from '@/config/logger';
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
import { TaskStep } from './TaskStep';
import { DeadlineExtensionDialog } from './DeadlineExtensionDialog';
import { DeadlineHistoryDialog } from './DeadlineHistoryDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { ModalAddTaskStep } from './ModalAddTaskStep';
import './TaskList.css';
import { format, differenceInDays, startOfDay, startOfMonth, isSameMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useToast } from '@/features/ui/use-toast';

export const TaskList = () => {
  const context = useDailyTask();
  const { tasks, filteredTasks, getVisibleSteps, filters, updateTask, deleteTask, addTaskStep, reorderTaskSteps, expandedTasks, setExpandedTasks, highlightedTask } = context;
  const [departmentMap, setDepartmentMap] = useState<Record<string, { id: string; name: string }>>({});
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [reminderPendingTaskId, setReminderPendingTaskId] = useState<string | null>(null);
  const [deadlineDialog, setDeadlineDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [addStepDialog, setAddStepDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const taskRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [blockerCountByTask, setBlockerCountByTask] = useState<Record<string, number>>({});
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalItems, setBlockerModalItems] = useState<any[]>([]);
  const blockerErrorCountRef = useRef(0); // Track consecutive errors for circuit breaker
  const blockerLastErrorRef = useRef<number>(0); // Track last error time

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

  // Fetch departments for tasks from daily_tasks_assigned
  useEffect(() => {
    const fetchDepartments = async () => {
      if (tasks.length === 0) return;

      const taskIds = tasks.map(t => t.id);
      
      try {
        // Fetch department_id from daily_tasks_assigned with employee join for fallback
        const { data: assignments, error: assignmentError } = await supabase
          .from('daily_tasks_assigned')
          .select(`
            daily_task_id, 
            department_id,
            employee_id,
            employee:employees!employee_id(department_id)
          `)
          .in('daily_task_id', taskIds);

        if (assignmentError) {
          console.error('Error fetching assignments:', assignmentError);
          return;
        }

        // Collect all department IDs (from daily_tasks_assigned or from employee)
        const departmentIds = new Set<string>();
        const taskDeptMapping: Array<{ taskId: string; deptId: string }> = [];

        (assignments || []).forEach(assignment => {
          // Priority: department_id from daily_tasks_assigned, then from employee
          let deptId = assignment.department_id;
          
          if (!deptId && assignment.employee_id && (assignment.employee as any)?.department_id) {
            deptId = (assignment.employee as any).department_id;
          }

          if (deptId) {
            departmentIds.add(deptId);
            taskDeptMapping.push({
              taskId: assignment.daily_task_id,
              deptId: deptId
            });
          }
        });

        if (departmentIds.size === 0) {
          setDepartmentMap({});
          return;
        }

        // Fetch department names
        const { data: departments, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', Array.from(departmentIds));

        if (deptError) {
          console.error('Error fetching departments:', deptError);
          return;
        }

        // Create department map
        const deptMap: Record<string, { id: string; name: string }> = {};
        (departments || []).forEach(dept => {
          deptMap[dept.id] = { id: dept.id, name: dept.name };
        });

        // Map departments to tasks
        const taskDeptMap: Record<string, { id: string; name: string }> = {};
        taskDeptMapping.forEach(({ taskId, deptId }) => {
          if (deptMap[deptId]) {
            taskDeptMap[taskId] = deptMap[deptId];
          }
        });

        setDepartmentMap(taskDeptMap);
      } catch (error) {
        console.error('Error in fetchDepartments:', error);
      }
    };

    fetchDepartments();
  }, [tasks]);
  
  // getVisibleSteps now comes from useTaskFilters hook

  const openTaskBlockers = async (task: Task) => {
    // OPTIMIZATION: Open modal immediately with loading state
    setBlockerModalItems([]);
    setBlockerModalOpen(true);

    try {
      // Use getVisibleSteps from hook to show steps based on filters
      const visibleSteps = getVisibleSteps(task);
      const stepIds = visibleSteps.map(s => s.id);
      
      // OPTIMIZATION: Fetch sub-steps and history in PARALLEL
      const subStepsPromise = stepIds.length > 0 
        ? supabase
            .from('task_steps_to_steps')
            .select('id, title, parent_step_id')
            .in('parent_step_id', stepIds)
        : Promise.resolve({ data: [], error: null });

      // Fetch history for steps with timeout - PARALLEL
      const stepHistoryPromise = stepIds.length > 0
        ? Promise.race([
            supabase
              .from('task_step_history')
              .select('*')
              .eq('action_type', 'blocker_added')
              .in('task_step_id', stepIds)
              .order('created_at', { ascending: false })
              .limit(50), // Reduced limit for faster response
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), 1500) // Reduced timeout
            )
          ]).catch(() => ({ data: null, error: { message: 'Timeout' } }))
        : Promise.resolve({ data: [], error: null });

      // Execute sub-steps and step history in parallel
      const [subStepsResult, stepHistoryResult] = await Promise.all([
        subStepsPromise,
        stepHistoryPromise
      ]) as any[];

      const subSteps = subStepsResult?.data || [];
      const subById: Record<string, any> = {};
      subSteps.forEach((s: any) => { subById[s.id] = s; });
      const subIds = subSteps.map((s: any) => s.id);

      // Fetch sub-step history ONLY if we have sub-steps
      let subStepHistoryResult: any = { data: [], error: null };
      if (subIds.length > 0) {
        subStepHistoryResult = await Promise.race([
          supabase
            .from('task_step_history')
            .select('*')
            .eq('action_type', 'blocker_added')
            .in('task_steps_to_steps_id', subIds)
            .order('created_at', { ascending: false })
            .limit(50), // Reduced limit
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 1500) // Reduced timeout
          )
        ]).catch(() => ({ data: null, error: { message: 'Timeout' } }));
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
      blockerErrorCountRef.current = 0; // Reset error count when no tasks
      return;
    }

    // Circuit breaker: Skip if too many consecutive errors (avoid spam)
    const now = Date.now();
    const timeSinceLastError = now - blockerLastErrorRef.current;
    const CIRCUIT_BREAKER_THRESHOLD = 3; // Max consecutive errors
    const CIRCUIT_BREAKER_COOLDOWN = 30000; // 30 seconds cooldown

    if (blockerErrorCountRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
      if (timeSinceLastError < CIRCUIT_BREAKER_COOLDOWN) {
        // Still in cooldown period, skip this fetch
        if (import.meta.env.DEV) {
          logger.debug(`⏭️ Blocker counts: Circuit breaker active (${Math.floor((CIRCUIT_BREAKER_COOLDOWN - timeSinceLastError) / 1000)}s remaining), skipping fetch`);
        }
        return;
      } else {
        // Cooldown expired, reset error count
        if (import.meta.env.DEV) {
          logger.debug('✅ Blocker counts: Circuit breaker cooldown expired, resetting');
        }
        blockerErrorCountRef.current = 0;
      }
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

        const allTaskIds = tasksToProcess.map(task => task.id);
        if (allTaskIds.length === 0) {
          setBlockerCountByTask({});
          return;
        }

        const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
          if (chunkSize <= 0) return [array];
          const result: T[][] = [];
          for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
          }
          return result;
        };

        const counts: Record<string, number> = {};
        const taskIdChunks = chunkArray(allTaskIds, 25);
        let hasError = false;

        for (let i = 0; i < taskIdChunks.length; i++) {
          const chunk = taskIdChunks[i];
          if (chunk.length === 0) continue;

          try {
            // Add timeout to prevent hanging requests
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), 5000)
            );

            const rpcPromise = supabase.rpc('get_unresolved_blocker_counts', { task_ids: chunk });

            let result: any;
            try {
              result = await Promise.race([rpcPromise, timeoutPromise]);
            } catch (raceError: any) {
              // Handle timeout or other race errors
              if (raceError?.message === 'Request timeout') {
                hasError = true;
                blockerErrorCountRef.current++;
                blockerLastErrorRef.current = Date.now();
                if (import.meta.env.DEV) {
                  logger.debug(`Blocker counts timeout (chunk ${i + 1}/${taskIdChunks.length})`);
                }
                continue;
              }
              throw raceError;
            }

            if (cancelled) return;

            const { data, error } = result || {};

            if (error) {
              hasError = true;
              blockerErrorCountRef.current++;
              blockerLastErrorRef.current = Date.now();
              
              // CRITICAL: Detect 500 errors from multiple sources
              // Supabase client may wrap errors differently, so check multiple properties
              const errorMessage = error.message || error.toString() || '';
              const errorCode = error.code || error.status || '';
              const isServerError = 
                errorCode === '500' || 
                errorCode === 500 ||
                error.status === 500 ||
                errorMessage.includes('500') ||
                errorMessage.includes('Server error (500)') ||
                errorMessage.includes('Internal Server Error') ||
                errorMessage.includes('database query failed');
              
              if (isServerError) {
                if (import.meta.env.DEV) {
                  logger.debug(`Blocker counts RPC returned 500 - activating circuit breaker immediately`);
                }
                // Set error count to threshold to activate circuit breaker
                blockerErrorCountRef.current = CIRCUIT_BREAKER_THRESHOLD;
                blockerLastErrorRef.current = Date.now();
                break; // Stop processing remaining chunks
              }
              
              // Only log in dev mode to reduce console noise
              if (import.meta.env.DEV) {
                logger.debug(`Failed to fetch blocker counts via RPC (chunk ${i + 1}/${taskIdChunks.length}):`, error);
              }
              
              // Skip this chunk and continue with others (for non-500 errors)
              continue;
            }

            // Reset error count on success (reset on first successful chunk)
            if (i === 0 || blockerErrorCountRef.current > 0) {
              blockerErrorCountRef.current = 0;
            }

            if (Array.isArray(data)) {
              data.forEach((row: any) => {
                if (row?.task_id) {
                  counts[row.task_id] = (counts[row.task_id] ?? 0) + (row.blocker_count ?? 0);
                }
              });
            }
          } catch (err: any) {
            hasError = true;
            blockerErrorCountRef.current++;
            blockerLastErrorRef.current = Date.now();
            
            // CRITICAL: Detect 500 errors from multiple sources
            const errorMessage = err?.message || err?.toString() || '';
            const errorCode = err?.code || err?.status || '';
            const isServerError = 
              errorCode === '500' || 
              errorCode === 500 ||
              err?.status === 500 ||
              errorMessage.includes('500') ||
              errorMessage.includes('Server error (500)') ||
              errorMessage.includes('Internal Server Error') ||
              errorMessage.includes('database query failed');
            
            if (isServerError) {
              if (import.meta.env.DEV) {
                logger.debug(`Blocker counts chunk error 500 - activating circuit breaker immediately`);
              }
              blockerErrorCountRef.current = CIRCUIT_BREAKER_THRESHOLD;
              blockerLastErrorRef.current = Date.now();
              break; // Stop processing remaining chunks
            }
            
            if (import.meta.env.DEV) {
              logger.debug(`Error fetching blocker counts via RPC (chunk ${i + 1}/${taskIdChunks.length}):`, err);
            }
            
            if (cancelled) return;
            // Continue with next chunk only for non-server errors
          }
        }

        // Set default count of 0 for all tasks
        tasksToProcess.forEach(task => {
          if (counts[task.id] === undefined) {
            counts[task.id] = 0;
          }
        });
        
        if (import.meta.env.DEV && !hasError) {
          logger.debug('🛠️ Blocker debug (RPC)', {
            totalTasks: tasksToProcess.length,
            counts,
          });
        }
        
        // Only update state if not cancelled
        if (!cancelled) {
          setBlockerCountByTask(counts);
        }
      } catch (e: any) {
        blockerErrorCountRef.current++;
        blockerLastErrorRef.current = Date.now();
        
        // CRITICAL: Detect 500 errors from multiple sources
        const errorMessage = e?.message || e?.toString() || '';
        const errorCode = e?.code || e?.status || '';
        const isServerError = 
          errorCode === '500' || 
          errorCode === 500 ||
          e?.status === 500 ||
          errorMessage.includes('500') ||
          errorMessage.includes('Server error (500)') ||
          errorMessage.includes('Internal Server Error') ||
          errorMessage.includes('database query failed');
        
        if (isServerError) {
          blockerErrorCountRef.current = CIRCUIT_BREAKER_THRESHOLD;
          if (import.meta.env.DEV) {
            logger.debug('Blocker counts outer error 500 - activating circuit breaker');
          }
        } else if (import.meta.env.DEV) {
          logger.debug('Error loading blocker counts:', e);
        }
        
        // Graceful degradation: Show tasks without blocker counts
        setBlockerCountByTask({});
      }
    };
    
    // Increased debounce to reduce query spam (from 300ms to 500ms)
    const timeoutId = setTimeout(loadCounts, 500);
    
    // Cleanup function to cancel if component unmounts or dependencies change
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [blockerCalculationKey]); // Only depend on blockerCalculationKey

  const toggleTaskExpansion = (taskId: string) => {
    const isOpen = expandedTasks.has(taskId);
    if (isOpen) {
      setExpandedTasks(new Set());
    } else {
      setExpandedTasks(new Set([taskId]));
    }
  };

  // Check if current user is the creator of the task
  const isTaskCreator = (task: Task): boolean => {
    return task.created_by === user?.id;
  };

  // Task dianggap "completed" hanya jika SEMUA step selesai (sesuai tampilan "X/Y steps").
  // Jika task punya steps, SELALU pakai step completion sebagai sumber kebenaran (abaikan task.status).
  // Jika ada step tambahan yang belum selesai (mis. 3/3 lalu jadi 3/4), task = belum completed.
  const isTaskFullyCompleteBySteps = (task: Task): boolean => {
    if (task.steps.length > 0) {
      const completedCount = task.steps.filter(s => s.is_completed).length;
      return completedCount === task.steps.length;
    }
    // Tanpa steps: ikut status (dan has_substeps untuk toggle behavior)
    if (task.has_substeps === false) {
      return task.status === 'completed';
    }
    return task.status === 'completed';
  };

  // Calculate progress only for visible steps (assigned OR created by user OR has assigned substeps)
  // When PIC filter is active, calculate progress for steps assigned to that PIC
  // When All PIC is selected, calculate progress for ALL steps
  // When task is assigned at task level, calculate progress for ALL steps
  // If task has no steps, progress is based on status (completed = 100%, not completed = 0%)
  const calculateAssignedStepsProgress = (task: Task): number => {
    const visibleSteps = getVisibleSteps(task);
    
    // If task has no steps, progress is based on status
    // This ensures that tasks without steps show 100% when completed
    if (visibleSteps.length === 0) {
      return task.status === 'completed' ? 100 : 0;
    }
    
    // If task has steps, calculate from completed steps
    const completedVisibleSteps = visibleSteps.filter(s => s.is_completed).length;
    return Math.round((completedVisibleSteps / visibleSteps.length) * 100);
  };

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
    
    // Jika task punya substeps: completed hanya ketika SEMUA step selesai (termasuk step tambahan baru).
    const isFullComplete = isTaskFullyCompleteBySteps(task);
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
    } else if (!isFullComplete && task.status !== 'completed' && task.status !== 'cancelled') {
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
    const variants: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-700 border-gray-200',
      'in_progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200',
    };
    
    return (
      <Badge className={`${variants[status] || ''} px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap hover:bg-inherit hover:text-inherit hover:opacity-100`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      'low': 'bg-green-100 text-green-700 border-green-200',
      'medium': 'bg-blue-100 text-blue-700 border-blue-200',
      'high': 'bg-orange-100 text-orange-700 border-orange-200',
      'urgent': 'bg-red-100 text-red-700 border-red-200',
      'needs_to_be_presented': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    
    const displayText: Record<string, string> = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'urgent': 'URGENT',
      'needs_to_be_presented': 'PRESENTATION',
    };
    
    return (
      <Badge className={`${variants[priority] || ''} px-2 py-1 text-xs font-medium rounded-md hover:bg-inherit hover:text-inherit hover:opacity-100`}>
        <Flag className="w-3 h-3 mr-1" />
        {displayText[priority] || priority.toUpperCase()}
      </Badge>
    );
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

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
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

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <TooltipProvider>
        <div className="h-full flex flex-col">
        <div ref={scrollContainerRef} className="flex-1 min-h-0 seamless-scroll overflow-auto">
          <table className="w-full caption-bottom text-sm task-list-table">
            <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                  <span className="sr-only">Expand</span>
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                  <span className="sr-only">Complete</span>
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                  Task Title
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                  Department
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  PIC
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Plan Date
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Due Date
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Finish Date
                </TableHead>
                <TableHead className="px-2 pr-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  Blocker
                </TableHead>
                <TableHead className="px-2 pr-8 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}>
                  Priority
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Status
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  Progress
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow className="w-full">
                  <TableCell colSpan={13} className="text-center py-8 text-gray-500 w-full" style={{ width: '100%' }}>
                    <div className="flex flex-col items-center w-full">
                      <CheckSquare className="w-8 h-8 mb-2 text-gray-300" />
                      <p>No tasks found</p>
                      <p className="text-sm text-gray-400">Create your first task to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
        const isExpanded = expandedTasks.has(task.id);
        const isOverdueTask = isOverdue(task.due_date, task.status);
        const isHighlighted = highlightedTask === task.id;
        
        return (
                    <React.Fragment key={task.id}>
                      {/* Main Task Row */}
                      <TableRow 
                        ref={(el) => { taskRefs.current[task.id] = el; }}
                        className={`w-full hover:bg-gray-50 transition-all duration-300 ${
                          isHighlighted 
                            ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-md' 
                            : ''
                        }`}
                      >
                        {/* Expand/Collapse Button */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpansion(task.id)}
                            className="h-7 w-7 p-0 hover:bg-gray-200"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>

                        {/* Checkbox */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusToggle(task);
                            }}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            title={
                              task.has_substeps === false
                                ? (task.status === 'completed' ? 'Mark incomplete' : 'Mark complete')
                                : (isTaskFullyCompleteBySteps(task) ? 'Mark complete / reopen' : 'Complete all steps to mark task complete')
                            }
                          >
                            {isTaskFullyCompleteBySteps(task) ? (
                              <CheckSquare className="w-5 h-5 text-green-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </TableCell>

                        {/* Task Title */}
                        <TableCell className="px-2 py-3" style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={`text-sm font-medium cursor-pointer hover:text-blue-600 truncate flex items-center gap-2 ${
                                  isTaskFullyCompleteBySteps(task) ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}
                                onClick={() => toggleTaskExpansion(task.id)}
                              >
                                {isHighlighted && (
                                  <Target className="w-4 h-4 text-blue-600 animate-pulse" />
                                )}
                                {task.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              align="start"
                              className="max-w-md p-4 bg-gray-900 text-white shadow-lg border-gray-700"
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-300 mt-2 border-t border-gray-700 pt-2">
                                  {task.description}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {task.steps.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {task.steps.filter(s => s.is_completed).length}/{task.steps.length} steps
                      </div>
                    )}
                    {task.files.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {task.files.length} files
                      </div>
                    )}
                  </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="px-2 py-3 text-left overflow-hidden" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {departmentMap[task.id] ? (
                              <>
                                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span
                                  className="text-sm text-gray-900 font-medium truncate block min-w-0"
                                  title={departmentMap[task.id].name}
                                >
                                  {departmentMap[task.id].name}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 italic">
                                No Department
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* PIC (Person In Charge) */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex items-center">
                            {task.assigned_to_name ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-900 font-medium">
                                  {task.assigned_to_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Plan Date */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {task.plan_date ? (() => {
                            const planDateObj = new Date(task.plan_date);
                            const dueDateObj = task.due_date ? new Date(task.due_date) : null;
                            const isDifferent = dueDateObj && !isSameMonth(planDateObj, dueDateObj);
                            
                            return (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span className="text-sm text-blue-600 font-medium">
                                  {format(planDateObj, 'MMM yyyy', { locale: idLocale })}
                                </span>
                                {isDifferent && (
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-xs font-bold" title="Plan date berbeda dari Due date">
                                    !
                                  </span>
                                )}
                              </div>
                            );
                          })() : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                            <Popover 
                            open={datePickerOpen === task.id} 
                            onOpenChange={(open) => {
                              setDatePickerOpen(open ? task.id : null);
                              // Reset reminder pending jika popover ditutup tanpa set date
                              if (!open && reminderPendingTaskId === task.id) {
                                setReminderPendingTaskId(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={`h-auto p-1 hover:bg-gray-100 rounded-md transition-colors ${
                                  isOverdueTask ? 'text-red-600 font-medium hover:bg-red-50' : 'text-gray-600'
                                }`}
                              >
                                {task.due_date ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span className="text-sm">{formatDate(task.due_date)}</span>
                                    </div>
                                    {isOverdueTask && (
                                      <span className="text-xs text-red-500">Overdue</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    <span className="text-sm">Set date</span>
                                  </div>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border border-gray-200 rounded-lg shadow-lg" align="center">
                              <div className="p-2">
                                {reminderPendingTaskId === task.id && !task.due_date && (
                                  <div className="mb-2 px-2 py-1.5 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    Set due date untuk mengaktifkan pengingat
                                  </div>
                                )}
                                <CustomDatePicker
                                  selected={task.due_date ? new Date(task.due_date) : undefined}
                                  onSelect={(date) => handleDateChange(task.id, date)}
                                  className="border-0 shadow-none"
                                />
                                {task.due_date && (
                                  <div className="flex justify-center pt-2 border-t mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleClearDate(task.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Clear Date
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Finish Date */}
                        {/* Use finish_date from daily_tasks table (automatically set by database trigger when status = 'completed') */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {task.finish_date ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">
                                  {formatDate(task.finish_date)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Blocker */}
                        <TableCell className="px-2 pr-2 py-3 text-center" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          {(() => {
                            const count = blockerCountByTask[task.id] || 0;
                            return count > 0 ? (
                              <button onClick={() => openTaskBlockers(task)} className="text-xs font-medium text-purple-700 hover:underline">
                                Found {count} Blocker{count > 1 ? 's' : ''}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            );
                          })()}
                        </TableCell>

                        {/* Priority */}
                        <TableCell className="px-2 pr-8 py-3 text-center" style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                disabled={!isTaskCreator(task)}
                                className={`priority-dropdown-trigger h-auto p-1 rounded-md transition-colors ${
                                  isTaskCreator(task) 
                                    ? 'hover:bg-gray-50 hover:text-inherit cursor-pointer' 
                                    : 'opacity-60 cursor-not-allowed'
                                }`}
                                title={isTaskCreator(task) ? 'Change priority' : '🔒 Only task creator can change priority'}
                              >
                                {getPriorityBadge(task.priority)}
                              </Button>
                            </DropdownMenuTrigger>
                            {isTaskCreator(task) && (
                              <DropdownMenuContent align="center" className="w-32">
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'low')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">Low</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'medium')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-700">Medium</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'high')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-orange-600" />
                                <span className="text-orange-700">High</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'urgent')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-red-600" />
                                <span className="text-red-700">Urgent</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'needs_to_be_presented')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-purple-600" />
                                <span className="text-purple-700">Presentation</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                            )}
                          </DropdownMenu>
                        </TableCell>

                        {/* Status - untuk task dengan steps, tampilkan derived: completed hanya jika semua step selesai */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {getStatusBadge(
                            task.steps.length > 0
                              ? (isTaskFullyCompleteBySteps(task) ? 'completed' : task.status === 'cancelled' ? 'cancelled' : 'pending')
                              : task.status
                          )}
                        </TableCell>

                        {/* Progress */}
                        <TableCell className="px-2 py-3" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              // Calculate progress once and reuse for both display and bar
                              const progress = calculateAssignedStepsProgress(task);
                              // Determine visible steps to check if we should show "No steps"
                              const visibleSteps = getVisibleSteps(task);
                              
                              return (
                                <>
                                  <div className="text-xs text-gray-500">
                                    {visibleSteps.length > 0 ? `${progress}%` : (task.status === 'completed' ? '100%' : 'No steps')}
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        progress === 100 ? 'bg-green-500' : 'bg-blue-600'
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                
                {/* Actions */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Reminder Icon (Pengingat) */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleReminder(task)}
                              className={`h-7 w-7 p-0 ${
                                (task.has_reminder ?? false)
                                  ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                              }`}
                              title={
                                (task.has_reminder ?? false) 
                                  ? 'Pengingat aktif' 
                                  : task.due_date 
                                  ? 'Aktifkan pengingat' 
                                  : 'Set due date terlebih dahulu untuk mengaktifkan pengingat'
                              }
                            >
                              <Bell className={`w-3 h-3 ${(task.has_reminder ?? false) ? 'fill-current' : ''}`} />
                            </Button>
                            
                            {/* History Icon */}
                            {task.deadline_history && task.deadline_history.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHistoryDialog({ isOpen: true, taskId: task.id })}
                                className="h-7 w-7 p-0 hover:bg-gray-50 hover:text-gray-600"
                                title="View deadline history"
                              >
                                <History className="w-3 h-3" />
                              </Button>
                            )}
                            
                            {/* Request Deadline Extension */}
                            {task.status !== 'completed' && task.due_date && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeadlineDialog({ isOpen: true, taskId: task.id })}
                                className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600"
                                title="Request deadline extension"
                              >
                                <Clock3 className="w-3 h-3" />
                              </Button>
                            )}
                            
                            {/* Edit - Locked for assigned users */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isTaskCreator(task) && setEditingTask(task.id)}
                              disabled={!isTaskCreator(task)}
                              className={`h-7 w-7 p-0 ${
                                isTaskCreator(task) 
                                  ? 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer' 
                                  : 'opacity-40 cursor-not-allowed'
                              }`}
                              title={isTaskCreator(task) ? 'Edit task' : '🔒 Only task creator can edit'}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            
                            {/* Delete - Locked for assigned users */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isTaskCreator(task) && handleDeleteClick(task)}
                              disabled={!isTaskCreator(task)}
                              className={`h-7 w-7 p-0 ${
                                isTaskCreator(task) 
                                  ? 'hover:bg-red-50 hover:text-red-600 cursor-pointer' 
                                  : 'opacity-40 cursor-not-allowed'
                              }`}
                              title={isTaskCreator(task) ? 'Delete task' : '🔒 Only task creator can delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Content Row */}
            {isExpanded && (
                        <TableRow className="w-full">
                          <TableCell colSpan={13} className={`w-full px-4 py-4 border-t border-blue-200 transition-all duration-300 ${
                            isHighlighted 
                              ? 'bg-blue-100 border-l-4 border-l-blue-500' 
                              : 'bg-blue-50'
                          }`} style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
                {task.description && (
                  <div className="mb-4 w-full min-w-0">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                    <div className="max-h-48 overflow-y-auto seamless-scroll">
                      <p className="text-sm text-gray-600 break-words whitespace-pre-wrap overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{task.description}</p>
                    </div>
                  </div>
                )}
                
                <div className="w-full space-y-4" style={{ width: '100%' }}>
                  {/* Steps Section */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-3 w-full">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        Steps ({(() => {
                          // Determine visible steps based on filters
                          const visibleSteps = getVisibleSteps(task);
                          const completedCount = visibleSteps.filter(s => s.is_completed).length;
                          return `${completedCount}/${visibleSteps.length}`;
                        })()})
                      </h4>
                      {/* Add Step - Locked for assigned users */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isTaskCreator(task)) {
                            setAddStepDialog({ isOpen: true, taskId: task.id, taskTitle: task.title });
                          }
                        }}
                        disabled={!isTaskCreator(task)}
                        className={`${
                          isTaskCreator(task) 
                            ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer' 
                            : 'text-gray-400 opacity-50 cursor-not-allowed'
                        }`}
                        title={isTaskCreator(task) ? 'Add a new step to this task' : '🔒 Only task creator can add steps'}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Step
                      </Button>
                    </div>
                    
                    <SortableContext items={task.steps.map(step => `step-${step.id}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 min-h-[50px] w-full">
                        {(() => {
                          // Determine visible steps based on filters
                          const visibleSteps = getVisibleSteps(task);
                          
                          if (visibleSteps.length === 0) {
                            return (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <CheckSquare className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                                <p className="text-sm font-medium text-blue-900 mb-1">No steps yet</p>
                                <p className="text-xs text-blue-700">
                                  {filters.pic 
                                    ? 'No steps assigned to selected PIC'
                                    : 'Steps will appear here once created or assigned to you'}
                                </p>
                              </div>
                            );
                          }
                          
                          return visibleSteps
                            .sort((a, b) => a.order - b.order)
                            .map((step, index) => (
                              <TaskStep key={step.id} step={step} index={index} taskCreatedBy={task.created_by} taskTitle={task.title} autoReorder={true} />
                            ));
                        })()}
                      </div>
                    </SortableContext>
                  </div>

                </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </table>
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
      </TooltipProvider>
    </DndContext>
  );
};
