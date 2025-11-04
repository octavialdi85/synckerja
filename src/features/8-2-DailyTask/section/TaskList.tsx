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
  Target
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
import { useDailyTask, type Task } from '../DailyTaskContext';
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
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isWithinInterval } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

export const TaskList = () => {
  const context = useDailyTask();
  const { tasks, filters, updateTask, deleteTask, addTaskStep, reorderTaskSteps, expandedTasks, setExpandedTasks, highlightedTask } = context;
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployee();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [deadlineDialog, setDeadlineDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [addStepDialog, setAddStepDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const taskRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [blockerCountByTask, setBlockerCountByTask] = useState<Record<string, number>>({});
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalItems, setBlockerModalItems] = useState<any[]>([]);

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
  

  const openTaskBlockers = async (task: Task) => {
    // OPTIMIZATION: Open modal immediately with loading state
    setBlockerModalItems([]);
    setBlockerModalOpen(true);

    try {
      // Fix: Use proper filter to only show steps assigned to current user
      const stepIds = task.steps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps).map(s => s.id);
      
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
      
      const enriched = allHistory.map((h: any) => {
        const step = task.steps.find(s => s.id === h.task_step_id) || null;
        const sub = h.task_steps_to_steps_id ? subById[h.task_steps_to_steps_id] : null;
        return {
          ...h,
          taskTitle: task.title,
          stepTitle: step?.title || (sub ? (task.steps.find(s => s.id === sub.parent_step_id)?.title || '-') : '-'),
          subStepTitle: sub?.title || null,
        };
      });
      
      setBlockerModalItems(enriched);
    } catch (error) {
      console.error('Error in openTaskBlockers:', error);
      setBlockerModalItems([]);
    }
  };


  // Filter tasks based on filters - memoized to prevent unnecessary recalculations
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // My Task filter - show only tasks created by current user (owned by user)
      if (filters.myTask === 'my_task') {
        const isTaskCreatedByUser = task.created_by === user?.id;
        if (!isTaskCreatedByUser) {
          return false;
        }
      }
      
      // Search filter - now includes both task title and step titles
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const taskTitleMatch = task.title?.toLowerCase().includes(searchTerm) || false;
        const taskDescriptionMatch = task.description?.toLowerCase().includes(searchTerm) || false;
        const stepMatch = task.steps?.some(step => 
          step.title?.toLowerCase().includes(searchTerm)
        ) || false;
        
        if (!taskTitleMatch && !taskDescriptionMatch && !stepMatch) {
          return false;
        }
      }
      
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      
      // PIC filter - check if any step is assigned to the selected employee
      if (filters.pic) {
        const hasStepAssignedToPic = task.steps?.some(step => 
          step.assigned_employee?.id === filters.pic
        ) || false;
        
        if (!hasStepAssignedToPic) {
          return false;
        }
      }
      
      // Date range filter - filter by task due_date
      if (filters.dateRange) {
        if (!task.due_date) {
          // If task has no due_date and a date filter is active, exclude it
          return false;
        }
        
        const taskDueDate = new Date(task.due_date);
        let startDate: Date;
        let endDate: Date;
        
        switch (filters.dateRange) {
          case 'today':
            startDate = startOfDay(new Date());
            endDate = endOfDay(new Date());
            break;
          case 'yesterday':
            const yesterday = subDays(new Date(), 1);
            startDate = startOfDay(yesterday);
            endDate = endOfDay(yesterday);
            break;
          case 'this_week':
            startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
            endDate = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday
            break;
          case 'this_month':
            startDate = startOfMonth(new Date());
            endDate = endOfMonth(new Date());
            break;
          case 'last_month':
            const lastMonth = subMonths(new Date(), 1);
            startDate = startOfMonth(lastMonth);
            endDate = endOfMonth(lastMonth);
            break;
          case 'custom':
            if (filters.customStartDate && filters.customEndDate) {
              startDate = startOfDay(new Date(filters.customStartDate));
              endDate = endOfDay(new Date(filters.customEndDate));
            } else {
              return true; // If custom dates not set, show all
            }
            break;
          default:
            return true;
        }
        
        if (!isWithinInterval(taskDueDate, { start: startDate, end: endDate })) {
          return false;
        }
      }
      
      return true;
    });
  }, [tasks, filters.search, filters.status, filters.priority, filters.pic, filters.dateRange, filters.customStartDate, filters.customEndDate, filters.myTask, user?.id, currentEmployee?.id]);

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
          const { data, error } = await supabase
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
          const { data, error } = await supabase
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
            const { data, error } = await supabase
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

  // Calculate progress only for visible steps (assigned OR created by user OR has assigned substeps)
  // When PIC filter is active, calculate progress for steps assigned to that PIC
  // When All PIC is selected, calculate progress for ALL steps
  const calculateAssignedStepsProgress = (task: Task): number => {
    let visibleSteps: typeof task.steps;
    if (filters.pic) {
      // Individual PIC selected - show steps assigned to that PIC
      visibleSteps = task.steps.filter(s => s.assigned_employee?.id === filters.pic);
    } else if (filters.myTask === 'all') {
      // All PIC mode - show ALL steps
      visibleSteps = task.steps;
    } else {
      // My Task mode - show steps assigned to current employee or created by user
      visibleSteps = task.steps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps);
    }
    if (visibleSteps.length === 0) return 0;
    const completedVisibleSteps = visibleSteps.filter(s => s.is_completed).length;
    return Math.round((completedVisibleSteps / visibleSteps.length) * 100);
  };

  const handleStatusToggle = async (task: Task) => {
    const assignedProgress = calculateAssignedStepsProgress(task);
    const isFullComplete = (task.steps?.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps).length || 0) > 0 && assignedProgress === 100;
    const newStatus = isFullComplete ? (task.status === 'completed' ? 'pending' : 'completed') : 'pending';
    if (newStatus !== task.status) {
      await updateTask(task.id, { status: newStatus });
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
    };
    
    return (
      <Badge className={`${variants[priority] || ''} px-2 py-1 text-xs font-medium rounded-md hover:bg-inherit hover:text-inherit hover:opacity-100`}>
        <Flag className="w-3 h-3 mr-1" />
        {priority.toUpperCase()}
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

  const handleDateChange = async (taskId: string, date: Date) => {
    await updateTask(taskId, { due_date: format(date, 'yyyy-MM-dd') });
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
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  PIC
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
                <TableHead className="px-2 pr-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
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
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500 w-full" style={{ width: '100%' }}>
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
                            onClick={() => handleStatusToggle(task)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            title={calculateAssignedStepsProgress(task) === 100 ? 'Mark complete / reopen' : 'Complete all assigned steps to mark task complete'}
                          >
                            {calculateAssignedStepsProgress(task) === 100 ? (
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
                                  calculateAssignedStepsProgress(task) === 100 ? 'line-through text-gray-500' : 'text-gray-900'
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

                        {/* Due Date */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          <Popover 
                            open={datePickerOpen === task.id} 
                            onOpenChange={(open) => setDatePickerOpen(open ? task.id : null)}
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
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {task.finish_date && calculateAssignedStepsProgress(task) === 100 ? (
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
                        <TableCell className="px-2 pr-4 py-3 text-center" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
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
                            </DropdownMenuContent>
                            )}
                          </DropdownMenu>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {getStatusBadge(task.status)}
                        </TableCell>

                        {/* Progress */}
                        <TableCell className="px-2 py-3" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              // Calculate progress once and reuse for both display and bar
                              const progress = calculateAssignedStepsProgress(task);
                              // Determine visible steps to check if we should show "No steps"
                              let visibleSteps: typeof task.steps;
                              if (filters.pic) {
                                visibleSteps = task.steps.filter(s => s.assigned_employee?.id === filters.pic);
                              } else if (filters.myTask === 'all') {
                                visibleSteps = task.steps;
                              } else {
                                visibleSteps = task.steps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps);
                              }
                              
                              return (
                                <>
                                  <div className="text-xs text-gray-500">
                                    {visibleSteps.length > 0 ? `${progress}%` : 'No steps'}
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
                          <TableCell colSpan={11} className={`w-full px-4 py-4 border-t border-blue-200 transition-all duration-300 ${
                            isHighlighted 
                              ? 'bg-blue-100 border-l-4 border-l-blue-500' 
                              : 'bg-blue-50'
                          }`} style={{ width: '100%' }}>
                {task.description && (
                  <div className="mb-4 w-full">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
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
                          let visibleSteps: typeof task.steps;
                          if (filters.pic) {
                            // Individual PIC selected - show steps assigned to that PIC
                            visibleSteps = task.steps.filter(s => s.assigned_employee?.id === filters.pic);
                          } else if (filters.myTask === 'all') {
                            // All PIC mode - show ALL steps
                            visibleSteps = task.steps;
                          } else {
                            // My Task mode - show steps assigned to current employee or created by user
                            visibleSteps = task.steps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps);
                          }
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
                          let visibleSteps: typeof task.steps;
                          if (filters.pic) {
                            // Individual PIC selected - show steps assigned to that PIC
                            visibleSteps = task.steps.filter(s => s.assigned_employee?.id === filters.pic);
                          } else if (filters.myTask === 'all') {
                            // All PIC mode - show ALL steps
                            visibleSteps = task.steps;
                          } else {
                            // My Task mode - show steps assigned to current employee or created by user
                            visibleSteps = task.steps.filter(s => s.assigned_to === currentEmployee?.id || s.created_by === user?.id || s.has_assigned_substeps);
                          }
                          
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
                              <TaskStep key={step.id} step={step} index={index} taskCreatedBy={task.created_by} />
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
