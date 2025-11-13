import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { retryableQuery } from '@/integrations/supabase/retry';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { getCached, setCache, clearCache, trackQuery } from './utils/optimizationUtils';
import { useTaskFilterState } from './hooks/useTaskFilterState';
import { TaskFilters } from './hooks/useTaskFilters';
import { useTaskRealtime } from './hooks/useTaskRealtime';
import {
  Task,
  TaskStep,
  TaskLink,
  TaskFile,
  DeadlineHistory,
  RecentStepUpdate,
  SummaryData,
  RecentStepFilters,
} from './types';
import { calculateProgress, determineStatusFromProgress, autoReorderTaskSteps } from './utils/taskUtils';
import { filterRecentStepUpdates } from './utils/filterUtils';
import { fetchRecentStepUpdates as fetchRecentStepUpdatesService } from './services/recentStepUpdateService';

export interface DailyTaskContextType {
  tasks: Task[];
  summaryData: SummaryData;
  recentStepUpdates: RecentStepUpdate[];
  filteredRecentStepUpdates: RecentStepUpdate[];
  recentStepFilters: RecentStepFilters;
  filters: TaskFilters;
  isLoading: boolean;
  expandedTasks: Set<string>;
  setExpandedTasks: (expandedTasks: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  highlightedTask: string | null;
  setHighlightedTask: (taskId: string | null) => void;
  setFilters: (filters: TaskFilters | ((prev: TaskFilters) => TaskFilters)) => void;
  setRecentStepFilters: (filters: RecentStepFilters | ((prev: RecentStepFilters) => RecentStepFilters)) => void;
  addTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskStep: (taskId: string, title: string) => Promise<void>;
  updateTaskStep: (stepId: string, data: Partial<TaskStep>, options?: { autoReorder?: boolean }) => Promise<void>;
  deleteTaskStep: (stepId: string) => Promise<void>;
  assignTaskStep: (stepId: string, employeeId: string | null) => Promise<void>;
  reorderTaskSteps: (taskId: string, stepIds: string[]) => Promise<void>;
  uploadTaskFile: (taskId: string, file: File) => Promise<void>;
  uploadTaskStepFile: (taskStepId: string, file: File) => Promise<void>;
  deleteTaskFile: (fileId: string) => Promise<void>;
  calculateTaskProgress: (taskId: string) => number;
  requestDeadlineExtension: (taskId: string, newDeadline: string, reason: string) => Promise<void>;
  approveDeadlineExtension: (historyId: string) => Promise<void>;
  rejectDeadlineExtension: (historyId: string) => Promise<void>;
  navigateToTask: (taskId: string, stepId?: string) => void;
  scrollToStep: (stepId: string) => void;
}

const DailyTaskContext = createContext<DailyTaskContextType | undefined>(undefined);

export const useDailyTask = () => {
  const context = useContext(DailyTaskContext);
  if (!context) {
    throw new Error('useDailyTask must be used within a DailyTaskProvider');
  }
  return context;
};

interface DailyTaskProviderProps {
  children: ReactNode;
}

export const DailyTaskProvider = ({ children }: DailyTaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentStepUpdates, setRecentStepUpdates] = useState<RecentStepUpdate[]>([]);
  const [filteredRecentStepUpdates, setFilteredRecentStepUpdates] = useState<RecentStepUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track recently updated tasks to skip real-time refresh (optimization for status updates)
  const recentlyUpdatedTasksRef = useRef<Set<string>>(new Set());
  // Track tasks that have been auto-fixed for has_reminder to avoid duplicate updates
  const autoFixedReminderRef = useRef<Set<string>>(new Set());
  
  // Use custom hook for filter state with localStorage persistence
  const { filters, setFilters } = useTaskFilterState();
  const [recentStepFilters, setRecentStepFilters] = useState<RecentStepFilters>({
    dateRange: 'today',
    actionType: 'all'
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  // Centralized fetch functions
  const fetchRecentStepUpdates = useCallback(async () => {
    if (!organizationId) return;

    try {
      const recentUpdates = await fetchRecentStepUpdatesService(organizationId);
      setRecentStepUpdates(recentUpdates);
    } catch (error) {
      console.error('Error fetching recent step updates:', error);
    }
  }, [organizationId]);

  const fetchTasks = async (force = false) => {
    if (!organizationId) return;

    try {
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.log('🔍 Fetching tasks for organization:', organizationId);
      }
      trackQuery('fetch_tasks');
      
      // Get current user to filter personal tasks only
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No authenticated user found');
        setTasks([]);
        return;
      }

      // Check cache first (60 seconds cache - INCREASED to save IO)
      // Cache key includes user ID to ensure user-specific caching
      const cacheKey = `tasks_${organizationId}_${user.id}`;
      if (!force) {
        const cached = getCached<any[]>(cacheKey, 60000); // 60s instead of 30s
        if (cached) {
          setTasks(cached);
          return;
        }
      }

      // Get current employee ID to filter assigned tasks
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (isDev) {
        console.log('👤 Current user:', user.id);
        console.log('👨‍💼 Current employee:', currentEmployee?.id);
      }

      // Get tasks assigned to current user at TASK level
      let assignedTaskIds: string[] = [];
      if (currentEmployee?.id) {
        const { data: assignedTasks } = await supabase
          .from('daily_tasks_assigned')
          .select('daily_task_id')
          .eq('employee_id', currentEmployee.id);
        
        assignedTaskIds = (assignedTasks || []).map((a: any) => a.daily_task_id);
        if (isDev) {
          console.log('📋 Task-level assigned IDs:', assignedTaskIds);
        }
      }

      // Get tasks where current user is assigned to any STEP
      let stepAssignedTaskIds: string[] = [];
      if (currentEmployee?.id) {
        const { data: assignedSteps } = await supabase
          .from('task_steps_assigned')
          .select(`
            task_step_id,
            task_steps!inner(task_id)
          `)
          .eq('employee_id', currentEmployee.id);
        
        if (assignedSteps && assignedSteps.length > 0) {
          stepAssignedTaskIds = [...new Set(
            (assignedSteps || [])
              .map((s: any) => s.task_steps?.task_id)
              .filter(Boolean)
          )];
          if (isDev) {
            console.log('📋 Step-level assigned task IDs:', stepAssignedTaskIds);
          }
        }
      }

      // Get tasks where current user is assigned to any SUB-STEP
      let subStepAssignedTaskIds: string[] = [];
      if (currentEmployee?.id) {
        const { data: assignedSubSteps } = await supabase
          .from('task_steps_to_steps_assigned')
          .select(`
            task_steps_to_steps_id,
            task_steps_to_steps!inner(
              parent_step_id,
              task_steps!inner(task_id)
            )
          `)
          .eq('employee_id', currentEmployee.id);
        
        if (assignedSubSteps && assignedSubSteps.length > 0) {
          subStepAssignedTaskIds = [...new Set(
            (assignedSubSteps || [])
              .map((s: any) => s.task_steps_to_steps?.task_steps?.task_id)
              .filter(Boolean)
          )];
          if (isDev) {
            console.log('📋 Sub-step-level assigned task IDs:', subStepAssignedTaskIds);
          }
        }
      }

      // Combine task-level, step-level, and sub-step-level assignments
      const allAssignedTaskIds = [...new Set([...assignedTaskIds, ...stepAssignedTaskIds, ...subStepAssignedTaskIds])];
      if (isDev) {
        console.log('📋 Combined assigned task IDs (task + step + sub-step):', allAssignedTaskIds);
      }
      
      // ULTRA-SIMPLIFIED QUERY: No nested joins to prevent timeout (error 57014)
      // Strategy: Fetch basic data only, load related data separately if needed
      // FILTER: Show ALL tasks in organization (filtering by PIC will be handled by client-side filter)
      // This allows users to see all tasks assigned to a specific PIC regardless of who created the task
      const { data, error } = await supabase
        .from('daily_tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          finish_date,
          organization_id,
          created_by,
          objective_id,
          has_substeps,
          has_reminder,
          created_at,
          updated_at
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
        // Removed limit to fetch all tasks

      if (error) {
        console.error('❌ Error fetching tasks:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          organizationId
        });
        throw error;
      }
      
      if (isDev) {
        console.log('✅ Fetched tasks (basic data):', data);
        console.log('📊 Task count:', data?.length || 0);
      }
      
      // Debug: Log if no tasks found
      if (!data || data.length === 0) {
        console.warn('⚠️ No tasks found for organization:', organizationId);
        setTasks([]);
        setCache(cacheKey, []);
        return;
      }

      // Fetch task steps separately to avoid timeout
      const taskIds = data.map(task => task.id);
      if (isDev) {
        console.log('🔍 Fetching task steps for tasks:', taskIds);
      }
      
      const { data: stepsData, error: stepsError } = await supabase
        .from('task_steps')
        .select(`
          id,
          task_id,
          title,
          is_completed,
          order,
          status,
          priority,
          created_at,
          updated_at,
          created_by
        `)
        .in('task_id', taskIds)
        .order('order', { ascending: true });

      if (stepsError) {
        console.error('❌ Error fetching task steps:', stepsError);
        // Continue without steps data rather than failing completely
      }

      if (isDev) {
        console.log('✅ Fetched task steps:', stepsData?.length || 0);
      }

      // Fetch task assignments separately to get PIC information
      if (isDev) {
        console.log('🔍 Fetching task assignments for tasks:', taskIds);
      }
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('daily_tasks_assigned')
        .select(`
          id,
          daily_task_id,
          employee_id,
          assigned_by,
          assigned_at,
          employee:employees!employee_id(id, full_name)
        `)
        .in('daily_task_id', taskIds);

      if (assignmentsError) {
        console.error('❌ Error fetching task assignments:', assignmentsError);
        // Continue without assignment data rather than failing completely
      }

      if (isDev) {
        console.log('✅ Fetched task assignments:', assignmentsData?.length || 0);
      }

      // Fetch step assignments separately to get PIC information for each step
      const stepIds = (stepsData || []).map(s => s.id);
      if (isDev) {
        console.log('🔍 Fetching step assignments for steps:', stepIds.length);
      }
      
      let stepAssignmentsData: any[] = [];
      if (stepIds.length > 0) {
        const { data: stepAssigns, error: stepAssignsError } = await supabase
          .from('task_steps_assigned')
          .select(`
            id,
            task_step_id,
            employee_id,
            assigned_by,
            assigned_at,
            employee:employees!employee_id(id, full_name, email),
            assigned_by_employee:employees!assigned_by(id, full_name, email)
          `)
          .in('task_step_id', stepIds)
          .order('assigned_at', { ascending: false });

        if (stepAssignsError) {
          console.error('❌ Error fetching step assignments:', stepAssignsError);
        } else {
          stepAssignmentsData = stepAssigns || [];
          if (isDev) {
            console.log('✅ Fetched step assignments:', stepAssignmentsData.length);
          }
        }
      }

      // Fetch ALL sub-steps (task_steps_to_steps) for all steps
      if (isDev) {
        console.log('🔍 Fetching sub-steps (task_steps_to_steps) for steps:', stepIds.length);
      }
      let subStepsData: any[] = [];
      if (stepIds.length > 0) {
        const { data: subSteps, error: subStepsError } = await supabase
          .from('task_steps_to_steps')
          .select(`
            id,
            parent_step_id,
            title,
            is_completed,
            order,
            created_at,
            updated_at
          `)
          .in('parent_step_id', stepIds)
          .order('order', { ascending: true });

        if (subStepsError) {
          console.error('❌ Error fetching sub-steps:', subStepsError);
        } else {
          subStepsData = subSteps || [];
          if (isDev) {
            console.log('✅ Fetched sub-steps:', subStepsData.length);
          }
        }
      }

      // Fetch sub-step assignments to know which parent steps have assigned sub-steps
      let subStepParentIds: string[] = [];
      let subStepAssignmentsData: any[] = [];
      if (stepIds.length > 0 && subStepsData.length > 0) {
        const subStepIds = subStepsData.map(s => s.id);
        
        // Fetch assignments for all sub-steps (not just current employee)
        const { data: subStepAssigns, error: subStepAssignsError } = await supabase
          .from('task_steps_to_steps_assigned')
          .select(`
            id,
            task_steps_to_steps_id,
            employee_id,
            assigned_by,
            assigned_at,
            employee:employees!employee_id(id, full_name, email)
          `)
          .in('task_steps_to_steps_id', subStepIds)
          .order('assigned_at', { ascending: false });

        if (subStepAssignsError) {
          console.error('❌ Error fetching sub-step assignments:', subStepAssignsError);
        } else {
          subStepAssignmentsData = subStepAssigns || [];
          if (isDev) {
            console.log('✅ Fetched sub-step assignments:', subStepAssignmentsData.length);
          }
          
          // Group sub-step assignments by sub-step ID
          const subStepAssignmentsBySubStepId: Record<string, any> = {};
          subStepAssignmentsData.forEach(assignment => {
            if (!subStepAssignmentsBySubStepId[assignment.task_steps_to_steps_id]) {
              subStepAssignmentsBySubStepId[assignment.task_steps_to_steps_id] = assignment;
            }
          });

          // Get parent step IDs that have assigned sub-steps (for current employee or any employee)
          subStepParentIds = [...new Set(
            subStepsData
              .filter(subStep => subStepAssignmentsBySubStepId[subStep.id])
              .map(subStep => subStep.parent_step_id)
              .filter(Boolean)
          )];
          if (isDev) {
            console.log('📋 Parent step IDs with assigned sub-steps:', subStepParentIds);
          }
        }
      }

      // Fetch task files for all steps
      if (isDev) {
        console.log('🔍 Fetching task files for steps:', stepIds.length);
      }
      let taskFilesData: any[] = [];
      if (stepIds.length > 0) {
        const { data: filesData, error: filesError } = await supabase
          .from('task_files')
          .select(`
            id,
            task_steps_id,
            filename,
            file_url,
            file_size,
            created_at
          `)
          .in('task_steps_id', stepIds)
          .order('created_at', { ascending: false });

        if (filesError) {
          console.error('❌ Error fetching task files:', filesError);
        } else {
          taskFilesData = filesData || [];
          if (isDev) {
            console.log('✅ Fetched task files:', taskFilesData.length);
          }
        }
      }

      // Group task files by step_id
      const filesByStepId: Record<string, any[]> = {};
      taskFilesData.forEach(file => {
        if (!filesByStepId[file.task_steps_id]) {
          filesByStepId[file.task_steps_id] = [];
        }
        filesByStepId[file.task_steps_id].push(file);
      });

      // Fetch due dates for step assignments
      let stepDueDatesData: any[] = [];
      if (stepAssignmentsData.length > 0) {
        const assignmentIds = stepAssignmentsData.map((a: any) => a.id);
        const { data: dueDatesData, error: dueDatesError } = await supabase
          .from('task_steps_assigned_duedate')
          .select('task_steps_assigned_id, due_date')
          .in('task_steps_assigned_id', assignmentIds)
          .order('created_at', { ascending: false });
        
        if (!dueDatesError && dueDatesData) {
          stepDueDatesData = dueDatesData || [];
        }
      }
      
      // Map due dates by assignment ID
      const dueDatesByAssignmentId: Record<string, string> = {};
      stepDueDatesData.forEach((dueDate: any) => {
        if (!dueDatesByAssignmentId[dueDate.task_steps_assigned_id]) {
          dueDatesByAssignmentId[dueDate.task_steps_assigned_id] = dueDate.due_date;
        }
      });

      // Group step assignments by task_step_id (only keep the latest one per step)
      const stepAssignmentsByStepId: Record<string, any> = {};
      stepAssignmentsData.forEach(assignment => {
        if (!stepAssignmentsByStepId[assignment.task_step_id]) {
          stepAssignmentsByStepId[assignment.task_step_id] = {
            ...assignment,
            assigned_due_date: dueDatesByAssignmentId[assignment.id] || null
          };
        }
      });

      // Group sub-steps by parent_step_id
      const subStepsByParentStepId: Record<string, any[]> = {};
      subStepsData.forEach(subStep => {
        if (!subStepsByParentStepId[subStep.parent_step_id]) {
          subStepsByParentStepId[subStep.parent_step_id] = [];
        }
        subStepsByParentStepId[subStep.parent_step_id].push(subStep);
      });

      // Group sub-step assignments by sub-step ID
      const subStepAssignmentsBySubStepId: Record<string, any> = {};
      subStepAssignmentsData.forEach(assignment => {
        if (!subStepAssignmentsBySubStepId[assignment.task_steps_to_steps_id]) {
          subStepAssignmentsBySubStepId[assignment.task_steps_to_steps_id] = assignment;
        }
      });

      // Group steps by task_id
      const stepsByTaskId: Record<string, any[]> = {};
      (stepsData || []).forEach(step => {
        if (!stepsByTaskId[step.task_id]) {
          stepsByTaskId[step.task_id] = [];
        }
        
        // Add assignment data to step if exists
        const stepAssignment = stepAssignmentsByStepId[step.id];
        const hasAssignedSubSteps = subStepParentIds.includes(step.id);
        
        // Get sub-steps for this step
        const subSteps = (subStepsByParentStepId[step.id] || []).map((subStep: any) => {
          const subStepAssignment = subStepAssignmentsBySubStepId[subStep.id];
          return {
            ...subStep,
            assigned_to: subStepAssignment?.employee_id || null,
            assigned_employee: subStepAssignment?.employee || null
          };
        });

        stepsByTaskId[step.task_id].push({
          ...step,
          assigned_to: stepAssignment?.employee_id || null,
          assigned_at: stepAssignment?.assigned_at || null,
          assigned_by: stepAssignment?.assigned_by || null,
          assigned_employee: stepAssignment?.employee || null,
          assigned_by_employee: stepAssignment?.assigned_by_employee || null,
          assigned_due_date: stepAssignment?.assigned_due_date || null,
          has_assigned_substeps: hasAssignedSubSteps, // Flag to show step if it has assigned sub-steps
          sub_steps: subSteps, // Include sub-steps data
          files: filesByStepId[step.id] || [] // Include files for this step
        });
      });

      // Group assignments by daily_task_id
      const assignmentsByTaskId: Record<string, any> = {};
      (assignmentsData || []).forEach(assignment => {
        // Only store the first assignment if there are multiple (shouldn't happen normally)
        if (!assignmentsByTaskId[assignment.daily_task_id]) {
          assignmentsByTaskId[assignment.daily_task_id] = assignment;
        }
      });
      
      // Calculate progress for each task and synchronize status
      const tasksWithProgress = (data || []).map((task: any) => {
        const taskSteps = stepsByTaskId[task.id] || [];
        const progress = calculateProgress(taskSteps);
        
        // For tasks without substeps (has_substeps = false), respect the manual status
        // Don't auto-synchronize status based on progress since they can be checked directly
        let synchronizedStatus: string;
        if (task.has_substeps === false) {
          // Respect the status from database for tasks without substeps
          synchronizedStatus = task.status;
        } else {
          // For tasks with substeps, synchronize based on progress
          synchronizedStatus = determineStatusFromProgress(progress, task.status);
        }
        
        // Get assignment data for this task
        const assignment = assignmentsByTaskId[task.id];
        const assignedEmployeeName = assignment?.employee?.full_name || null;
        const assignedEmployeeId = assignment?.employee_id || null;
        
        // Auto-fix: If task is completed but has_reminder is true, set it to false
        let hasReminder = task.has_reminder;
        if (synchronizedStatus === 'completed' && hasReminder === true) {
          hasReminder = false;
          // Auto-fix in database (non-blocking, only once per task)
          if (!autoFixedReminderRef.current.has(task.id)) {
            autoFixedReminderRef.current.add(task.id);
            supabase
              .from('daily_tasks')
              .update({ has_reminder: false })
              .eq('id', task.id)
              .then(({ error }) => {
                if (error) {
                  console.warn('Failed to auto-fix has_reminder for task:', task.id, error);
                  autoFixedReminderRef.current.delete(task.id); // Retry on next fetch
                }
              });
          }
        }
        
        return {
          ...task,
          steps: taskSteps.map((step: any) => ({
            ...step,
            // files are already included from stepsByTaskId mapping
            links: [], // Load separately on demand
            history: [], // Load separately on demand
            // Keep assignment data that was already set in stepsByTaskId
            // assigned_to and assigned_employee are already in step from previous mapping
          })),
          deadline_history: [], // Load separately on demand
          progress_percentage: progress,
          status: synchronizedStatus,
          assigned_to: assignedEmployeeId,
          assigned_to_name: assignedEmployeeName,
          has_reminder: hasReminder, // Use corrected value
          has_steps: taskSteps.length > 0, // Set based on actual steps count
          files: []
        };
      });
      
      setTasks(tasksWithProgress);
      
      // Cache the results
      setCache(cacheKey, tasksWithProgress);
      
      // Update status in database for tasks that need synchronization
      await syncTaskStatusesInDatabase(tasksWithProgress, data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive'
      });
    }
  };

  const syncTaskStatusesInDatabase = async (synchronizedTasks: Task[], originalTasks: any[]) => {
    try {
      const updatesNeeded = synchronizedTasks.filter((task, index) => {
        const originalTask = originalTasks[index];
        // Don't sync status for tasks without substeps - they can be manually set
        if (task.has_substeps === false) {
          return false;
        }
        return originalTask && task.status !== originalTask.status;
      });

      if (updatesNeeded.length > 0) {
        console.log('Syncing task statuses in database:', updatesNeeded.map(t => ({ id: t.id, oldStatus: originalTasks.find(ot => ot.id === t.id)?.status, newStatus: t.status })));
        
        // Update status and finish_date for each task that needs synchronization
        for (const task of updatesNeeded) {
          const updateData: any = { status: task.status };
          
          // Ensure finish_date logic: if status is not 'completed', finish_date must be NULL
          // If status is 'completed' and finish_date is not set, set it to current timestamp
          if (task.status === 'completed') {
            if (!task.finish_date) {
              updateData.finish_date = new Date().toISOString();
            }
          } else {
            // If status is not completed, ensure finish_date is NULL
            updateData.finish_date = null;
          }
          
          const { error } = await supabase
            .from('daily_tasks')
            .update(updateData)
            .eq('id', task.id);
          
          if (error) {
            console.error(`Error updating status for task ${task.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing task statuses:', error);
    }
  };


  // Calculate summary data from tasks
  const summaryData: SummaryData = {
    pending: (tasks || []).filter(task => task && task.status === 'pending').length,
    inProgress: (tasks || []).filter(task => task && task.status === 'in_progress').length,
    completed: (tasks || []).filter(task => task && task.status === 'completed').length,
    cancelled: (tasks || []).filter(task => task && task.status === 'cancelled').length,
    overdue: (tasks || []).filter(task => {
      if (!task || !task.due_date) return false;
      return new Date(task.due_date) < new Date() && task.status !== 'completed';
    }).length,
    totalSteps: (tasks || []).reduce((sum, task) => sum + (task?.steps?.length || 0), 0),
    completedSteps: (tasks || []).reduce((sum, task) => 
      sum + (task?.steps?.filter(step => step && step.is_completed).length || 0), 0
    )
  };

  const addTask = async (data: Partial<Task>) => {
    if (!organizationId) return;

    try {
      console.log('Adding task to database:', { ...data, organization_id: organizationId });
      
      const { data: newTask, error } = await supabase
        .from('daily_tasks')
        .insert({
          organization_id: organizationId,
          title: data.title || '',
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          due_date: data.due_date || null,
          objective_id: (data as any).objective_id || null,
          created_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // If task should be assigned, create assignment in daily_tasks_assigned
      if (data.assigned_to) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: assignedBy } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user?.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (assignedBy) {
          // Insert assignment record
          const { data: assignmentRecord, error: assignmentError } = await supabase
            .from('daily_tasks_assigned')
            .insert({
              organization_id: organizationId,
              daily_task_id: newTask.id,
              employee_id: data.assigned_to,
              assigned_by: assignedBy.id,
              assigned_at: new Date().toISOString()
            })
            .select()
            .single();

          if (assignmentError) {
            console.error('Error creating assignment:', assignmentError);
          }

          // If deadline is provided, save it to task_steps_assigned_duedate table
          if (data.due_date && assignmentRecord) {
            console.log('💾 Saving deadline to task_steps_assigned_duedate:', {
              daily_tasks_assigned_id: assignmentRecord.id,
              due_date: data.due_date,
              organization_id: organizationId
            });

            const { data: deadlineRecord, error: deadlineError } = await supabase
              .from('task_steps_assigned_duedate')
              .insert({
                organization_id: organizationId,
                daily_tasks_assigned_id: assignmentRecord.id,
                due_date: data.due_date,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (deadlineError) {
              console.error('❌ Error saving deadline:', deadlineError);
            } else {
              console.log('✅ Deadline saved successfully:', deadlineRecord);
            }
          } else {
            console.log('⚠️ Deadline not saved:', {
              has_due_date: !!data.due_date,
              has_assignment_record: !!assignmentRecord,
              due_date_value: data.due_date
            });
          }
        }
      }

      console.log('Task added successfully');
      
      toast({
        title: 'Success',
        description: 'Task added successfully'
      });
      
      // Clear cache for all users and refresh data immediately
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive'
      });
    }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    // Find the current task to check has_reminder value
    const currentTask = tasks.find(t => t.id === id);
    
    // If status is being set to "completed" and has_reminder is true, set it to false
    if (data.status === 'completed' && currentTask?.has_reminder === true) {
      data.has_reminder = false;
    }
    
    // Ensure finish_date logic: if status is not 'completed', finish_date must be NULL
    // If status is 'completed' and finish_date is not set, set it to current timestamp
    if (data.status !== undefined) {
      if (data.status === 'completed') {
        // If status is being set to completed and finish_date is not provided, set it
        if (!data.finish_date) {
          data.finish_date = new Date().toISOString();
        }
      } else {
        // If status is not completed, ensure finish_date is NULL
        data.finish_date = null;
      }
    }
    
    // Extract assigned_to from data since it's not a column in daily_tasks table
    const assignedTo = data.assigned_to;
    const updateData = { ...data };
    delete (updateData as any).assigned_to;
    delete (updateData as any).assigned_to_name;
    
    // Optimistic update: update local state immediately
    const previousTasks = [...tasks];
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === id) {
          // Simply apply the update directly - no complex logic needed for optimistic update
          return { ...task, ...data };
        }
        return task;
      })
    );

    try {
      // Update the task (excluding assigned_to which is handled separately)
      const { error } = await supabase
        .from('daily_tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Handle assignment separately using daily_tasks_assigned table
      if (assignedTo !== undefined) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: assignedBy } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user?.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (assignedBy) {
          // Check if assignment already exists
          const { data: existingAssignment } = await supabase
            .from('daily_tasks_assigned')
            .select('id')
            .eq('daily_task_id', id)
            .maybeSingle();

          if (assignedTo) {
            // Update or create assignment
            if (existingAssignment) {
              // Update existing assignment
              const { error: assignmentError } = await supabase
                .from('daily_tasks_assigned')
                .update({
                  employee_id: assignedTo,
                  assigned_by: assignedBy.id,
                  assigned_at: new Date().toISOString()
                })
                .eq('id', existingAssignment.id);

              if (assignmentError) {
                console.error('Error updating assignment:', assignmentError);
              }
            } else {
              // Create new assignment
              const { error: assignmentError } = await supabase
                .from('daily_tasks_assigned')
                .insert({
                  organization_id: organizationId,
                  daily_task_id: id,
                  employee_id: assignedTo,
                  assigned_by: assignedBy.id,
                  assigned_at: new Date().toISOString()
                });

              if (assignmentError) {
                console.error('Error creating assignment:', assignmentError);
              }
            }
          } else {
            // Remove assignment if assignedTo is null/empty
            if (existingAssignment) {
              const { error: assignmentError } = await supabase
                .from('daily_tasks_assigned')
                .delete()
                .eq('id', existingAssignment.id);

              if (assignmentError) {
                console.error('Error deleting assignment:', assignmentError);
              }
            }
          }
        }
      }

      // For status updates (and has_reminder auto-update when completing), mark task as recently updated to skip real-time refresh
      // Check if update is primarily a status update (has_reminder might be auto-set to false)
      // Also check if assignment changed (assigned_to is handled separately)
      const isStatusUpdate = data.status !== undefined;
      const hasAssignmentChange = assignedTo !== undefined;
      const hasOnlyStatusOrReminder = Object.keys(updateData).every(key => key === 'status' || key === 'has_reminder' || key === 'finish_date');
      
      if (isStatusUpdate && hasOnlyStatusOrReminder && !hasAssignmentChange) {
        // Mark this task as recently updated to skip real-time refresh
        // For tasks without substeps, extend the skip time since they don't have progress-based sync
        const skipDuration = currentTask?.has_substeps === false ? 5000 : 3000;
        recentlyUpdatedTasksRef.current.add(id);
        // Clear after specified duration (enough time for real-time event to arrive)
        setTimeout(() => {
          recentlyUpdatedTasksRef.current.delete(id);
        }, skipDuration);
      } else {
        // Refresh for non-status updates (title, description, priority, assignment changes, etc.)
        clearCache(`tasks_${organizationId}_*`);
        fetchTasks(true).catch(err => console.error('Background refresh failed:', err));
      }
      
      // Don't show toast for status updates to reduce noise
      if (!data.status) {
        toast({
          title: 'Success',
          description: 'Task updated successfully'
        });
      }
    } catch (error) {
      // Rollback on error
      setTasks(previousTasks);
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
      
      // Clear cache for all users and refresh data immediately
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      });
    }
  };

  const addTaskStep = async (taskId: string, title: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current max order for this task
      const { data: existingSteps } = await supabase
        .from('task_steps')
        .select('order')
        .eq('task_id', taskId)
        .order('order', { ascending: false })
        .limit(1);

      const nextOrder = existingSteps && existingSteps.length > 0 
        ? ((existingSteps as any)[0].order as number) + 1 
        : 1;

      const { error } = await supabase
        .from('task_steps')
        .insert({
          task_id: taskId,
          title,
          is_completed: false,
          order: nextOrder,
          created_by: user?.id || null
        });

      if (error) throw error;

      // Update has_steps to true (optimistic update - trigger will handle it, but we do it for consistency)
      const { error: updateError } = await supabase
        .from('daily_tasks')
        .update({ has_steps: true })
        .eq('id', taskId);
      
      if (updateError) {
        console.warn('Failed to update has_steps:', updateError);
      }

      toast({
        title: 'Success',
        description: 'Step added successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error adding step:', error);
      toast({
        title: 'Error',
        description: 'Failed to add step',
        variant: 'destructive'
      });
    }
  };

  const updateTaskStep = async (stepId: string, data: Partial<TaskStep>, options?: { autoReorder?: boolean }) => {
    try {
      // Fetch existing to detect status change - with retry
      const { data: before } = await retryableQuery(async () => {
        const result = await supabase
          .from('task_steps')
          .select('id, is_completed, title, task_id')
          .eq('id', stepId)
          .single();
        if (result.error) throw result.error;
        return result;
      });

      // Update step - with retry
      const { error } = await retryableQuery(async () => {
        const result = await supabase
          .from('task_steps')
          .update(data)
          .eq('id', stepId);
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      // Get task_id for this step
      const { data: stepData } = await supabase
        .from('task_steps')
        .select('task_id')
        .eq('id', stepId)
        .single();

      const taskId = (stepData as any)?.task_id;

      // Check if completion status changed (before we update anything)
      // Safely check if before exists and if completion status changed
      const beforeCompleted = before ? (before as any).is_completed : false;
      const afterCompleted = typeof data.is_completed === 'boolean' ? data.is_completed : beforeCompleted;
      const completionChanged = typeof data.is_completed === 'boolean' && before && beforeCompleted !== data.is_completed;

      // Track if we should skip refresh (for mobile auto-reorder)
      let skipRefresh = false;

      if (taskId) {
        // Get all steps for this task
        const { data: allSteps } = await supabase
          .from('task_steps')
          .select('is_completed')
          .eq('task_id', taskId);

        if (allSteps) {
          // Calculate progress and determine new status
          const progress = calculateProgress(allSteps as any);
          const newStatus = determineStatusFromProgress(progress, 'pending');
          
          // Get current task status
          const { data: currentTask } = await supabase
            .from('daily_tasks')
            .select('status')
            .eq('id', taskId)
            .single();
          
          const finalStatus = determineStatusFromProgress(progress, (currentTask as any)?.status || 'pending');
          
          // Update task status and finish_date based on progress
          const updateData: any = { status: finalStatus };
          
          if (finalStatus === 'completed' && progress === 100) {
            updateData.finish_date = new Date().toISOString();
          } else if (finalStatus !== 'completed') {
            updateData.finish_date = null;
          }
          
          await supabase
            .from('daily_tasks')
            .update(updateData)
            .eq('id', taskId);
        }

        // Auto-reorder steps if completion status changed and autoReorder is enabled
        if (options?.autoReorder && completionChanged && taskId) {
          // Auto-reorder steps and update local state without full reload
          try {
            const reorderResult = await autoReorderTaskSteps(taskId);
            
            if (reorderResult && reorderResult.length > 0) {
              skipRefresh = true; // Mark to skip refresh
              
              // Update local state with new order and step completion without full reload
              setTasks(prevTasks => {
                return prevTasks.map(task => {
                  if (task.id !== taskId) return task;
                  
                  // Create order mapping
                  const orderMap = new Map<string, number>();
                  reorderResult.forEach(r => {
                    orderMap.set(r.stepId, r.newOrder);
                  });
                  
                  // Update steps with new order, completion status, and sort
                  const updatedSteps = task.steps
                    .map(step => {
                      const newOrder = orderMap.get(step.id);
                      if (step.id === stepId) {
                        // Update the toggled step's completion status
                        return {
                          ...step,
                          order: newOrder !== undefined ? newOrder : step.order,
                          is_completed: afterCompleted,
                          updated_at: new Date().toISOString()
                        };
                      }
                      // Update order for other steps
                      return {
                        ...step,
                        order: newOrder !== undefined ? newOrder : step.order
                      };
                    })
                    .sort((a, b) => a.order - b.order);
                  
                  // Recalculate progress
                  const progress = calculateProgress(updatedSteps);
                  
                  return {
                    ...task,
                    steps: updatedSteps,
                    progress_percentage: progress,
                    status: determineStatusFromProgress(progress, task.status) as any
                  };
                });
              });
              
              // Clear cache but don't refresh - we already updated local state
              clearCache(`tasks_${organizationId}_*`);
              
              // Record history if completion status changed (async, don't wait)
              if (completionChanged) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  (supabase as any)
                    .from('task_step_history')
                    .insert({
                      task_step_id: stepId,
                      action_type: 'status_change',
                      old_value: beforeCompleted ? 'completed' : 'pending',
                      new_value: afterCompleted ? 'completed' : 'pending',
                      description: afterCompleted ? 'Step completed' : 'Step reopened',
                      created_by: user?.id || null,
                    });
                }).catch(err => console.error('Error recording history:', err));
              }
            }
          } catch (error) {
            console.error('Error auto-reordering steps:', error);
            // Don't throw - continue with normal flow even if reorder fails
          }
        }
      }
        
      // Record history if completion status changed (only if auto-reorder didn't handle it)
      if (completionChanged && !skipRefresh) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any)
          .from('task_step_history')
          .insert({
            task_step_id: stepId,
            action_type: 'status_change',
            old_value: beforeCompleted ? 'completed' : 'pending',
            new_value: afterCompleted ? 'completed' : 'pending',
            description: afterCompleted ? 'Step completed' : 'Step reopened',
            created_by: user?.id || null,
          });
      }

      // Don't show toast notification - this is an internal update function
      // Toast notifications should only appear for explicit user actions
      // If toast is needed, it should be shown at the call site for user-initiated actions
      
      // Only refresh if we didn't skip it (for mobile auto-reorder)
      // For mobile with auto-reorder, we skip fetchTasks to avoid reload that confuses users
      if (!skipRefresh) {
        // Normal update flow - clear cache and refresh
        clearCache(`tasks_${organizationId}_*`);
        await fetchTasks(true);
      }
      // If skipRefresh is true, we've already updated local state above, so skip fetchTasks
    } catch (error: any) {
      console.error('Error updating step:', error);
      
      // Check if it's a network error
      const isNetworkError = error?.message?.includes('Network') || 
                            error?.message?.includes('timeout') ||
                            error?.message?.includes('CORS') ||
                            error?.message?.includes('520');
      
      toast({
        title: isNetworkError ? 'Network Error' : 'Error',
        description: isNetworkError 
          ? 'Connection issue. Please check your internet and try again.' 
          : 'Failed to update step',
        variant: 'destructive'
      });
    }
  };

  const assignTaskStep = async (stepId: string, employeeId: string | null, dueDateIso?: string | null) => {
    try {
      console.log('🎯 Assigning step:', { stepId, employeeId, dueDateIso });
      
      // Get current user to set assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: currentEmployee } = await supabase
        .from('employees' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Current employee ID:', currentEmployee?.id);

      if (employeeId) {
        // delete any existing assignment rows (we only keep latest)
        await supabase
          .from('task_steps_assigned')
          .delete()
          .eq('task_step_id', stepId);

        // insert new assignment
        // fetch organization id via step -> task, and get social_media_plan_id
        const { data: stepTask } = await supabase
          .from('task_steps')
          .select('task_id, social_media_plan_id')
          .eq('id', stepId)
          .single();
        const { data: taskOrg } = await supabase
          .from('daily_tasks')
          .select('organization_id')
          .eq('id', (stepTask as any)?.task_id)
          .single();

        const { data: inserted, error } = await supabase
          .from('task_steps_assigned')
          .insert({
            organization_id: (taskOrg as any)?.organization_id || null,
            task_step_id: stepId,
            employee_id: employeeId,
            assigned_by: (currentEmployee as any)?.id || null,
            assigned_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) throw error;

        console.log('✅ Step assigned successfully. Assignment ID:', (inserted as any)?.id);

        // Save due date if provided
        if (dueDateIso) {
          const { data: dueDateRecord, error: dueDateError } = await supabase
            .from('task_steps_assigned_duedate')
            .insert({
              organization_id: (taskOrg as any)?.organization_id || null,
              task_steps_assigned_id: (inserted as any).id,
              due_date: dueDateIso,
            })
            .select()
            .single();
          
          if (dueDateError) {
            console.error('❌ Error saving due date:', dueDateError);
          } else {
            console.log('✅ Due date saved:', dueDateRecord);
          }
        }

        // Sync pic_production_id to social_media_plans if this step is linked to a plan
        if ((stepTask as any)?.social_media_plan_id) {
          try {
            const planId = (stepTask as any).social_media_plan_id;
            // Get current plan data
            const { data: planData } = await supabase
              .from('social_media_plans')
              .select('pic_production_id, pic_production_source, google_drive_link')
              .eq('id', planId)
              .maybeSingle();
            
            if (planData) {
              // Import and use syncPicProduction function
              // We'll use a direct implementation here to avoid circular dependencies
              // Get latest assignment for this plan
              const { data: assignmentData } = await supabase
                .from('task_steps_assigned')
                .select(`
                  id,
                  employee_id,
                  assigned_at,
                  task_steps!inner(
                    id,
                    social_media_plan_id
                  )
                `)
                .eq('task_steps.social_media_plan_id', planId)
                .order('assigned_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              const assignedEmployeeId = assignmentData?.employee_id || null;
              
              // Determine new pic_production_id and source
              let newPicProductionId: string | null = null;
              let newPicProductionSource: string | null = null;
              
              if (assignedEmployeeId) {
                newPicProductionId = assignedEmployeeId;
                newPicProductionSource = 'task_steps_assigned';
              } else if (planData.google_drive_link) {
                if (planData.pic_production_source === 'google_drive_link' && planData.pic_production_id) {
                  newPicProductionId = planData.pic_production_id;
                  newPicProductionSource = 'google_drive_link';
                } else {
                  newPicProductionId = null;
                  newPicProductionSource = null;
                }
              } else {
                newPicProductionId = null;
                newPicProductionSource = null;
              }
              
              // Update database only if changed
              if (newPicProductionId !== planData.pic_production_id || newPicProductionSource !== planData.pic_production_source) {
                const { error: updateError } = await supabase
                  .from('social_media_plans')
                  .update({
                    pic_production_id: newPicProductionId,
                    pic_production_source: newPicProductionSource
                  })
                  .eq('id', planId);
                
                if (updateError) {
                  console.error('❌ Error syncing pic_production_id:', updateError);
                } else {
                  console.log('✅ Synced pic_production_id after assignment:', {
                    planId,
                    employeeId: newPicProductionId,
                    source: newPicProductionSource
                  });
                }
              }
            }
          } catch (syncError) {
            console.error('Error syncing pic_production_id in assignTaskStep:', syncError);
            // Don't fail the whole operation if sync fails
          }
        }
      } else {
        // unassign by deleting assignment rows for this step
        console.log('🔓 Unassigning step:', stepId);
        
        // Get social_media_plan_id before deleting assignment
        const { data: stepData } = await supabase
          .from('task_steps')
          .select('social_media_plan_id')
          .eq('id', stepId)
          .maybeSingle();
        
        const { error } = await supabase
          .from('task_steps_assigned')
          .delete()
          .eq('task_step_id', stepId);
        if (error) throw error;
        console.log('✅ Step unassigned successfully');

        // Sync pic_production_id after unassignment if this step was linked to a plan
        if ((stepData as any)?.social_media_plan_id) {
          try {
            const planId = (stepData as any).social_media_plan_id;
            // Get current plan data
            const { data: planData } = await supabase
              .from('social_media_plans')
              .select('pic_production_id, pic_production_source, google_drive_link')
              .eq('id', planId)
              .maybeSingle();
            
            if (planData) {
              // Get latest assignment for this plan (after deletion)
              const { data: assignmentData } = await supabase
                .from('task_steps_assigned')
                .select(`
                  id,
                  employee_id,
                  assigned_at,
                  task_steps!inner(
                    id,
                    social_media_plan_id
                  )
                `)
                .eq('task_steps.social_media_plan_id', planId)
                .order('assigned_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              const assignedEmployeeId = assignmentData?.employee_id || null;
              
              // Determine new pic_production_id and source
              let newPicProductionId: string | null = null;
              let newPicProductionSource: string | null = null;
              
              if (assignedEmployeeId) {
                newPicProductionId = assignedEmployeeId;
                newPicProductionSource = 'task_steps_assigned';
              } else if (planData.google_drive_link) {
                if (planData.pic_production_source === 'google_drive_link' && planData.pic_production_id) {
                  newPicProductionId = planData.pic_production_id;
                  newPicProductionSource = 'google_drive_link';
                } else {
                  newPicProductionId = null;
                  newPicProductionSource = null;
                }
              } else {
                newPicProductionId = null;
                newPicProductionSource = null;
              }
              
              // Update database only if changed
              if (newPicProductionId !== planData.pic_production_id || newPicProductionSource !== planData.pic_production_source) {
                const { error: updateError } = await supabase
                  .from('social_media_plans')
                  .update({
                    pic_production_id: newPicProductionId,
                    pic_production_source: newPicProductionSource
                  })
                  .eq('id', planId);
                
                if (updateError) {
                  console.error('❌ Error syncing pic_production_id after unassignment:', updateError);
                } else {
                  console.log('✅ Synced pic_production_id after unassignment:', {
                    planId,
                    employeeId: newPicProductionId,
                    source: newPicProductionSource
                  });
                }
              }
            }
          } catch (syncError) {
            console.error('Error syncing pic_production_id after unassignment:', syncError);
            // Don't fail the whole operation if sync fails
          }
        }
      }

      toast({
        title: 'Success',
        description: employeeId ? 'Step assigned successfully' : 'Step unassigned successfully'
      });
      
      console.log('🔄 Refreshing tasks...');
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
      console.log('✅ Tasks refreshed');
    } catch (error) {
      console.error('Error assigning step:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign step',
        variant: 'destructive'
      });
    }
  };

  const deleteTaskStep = async (stepId: string) => {
    try {
      // Get task_id and social_media_plan_id before deleting
      const { data: stepData } = await supabase
        .from('task_steps')
        .select('task_id, social_media_plan_id')
        .eq('id', stepId)
        .maybeSingle();

      const { error } = await supabase
        .from('task_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      // Sync pic_production_id after step deletion if this step was linked to a plan
      if ((stepData as any)?.social_media_plan_id) {
        try {
          const planId = (stepData as any).social_media_plan_id;
          // Get current plan data
          const { data: planData } = await supabase
            .from('social_media_plans')
            .select('pic_production_id, pic_production_source, google_drive_link')
            .eq('id', planId)
            .maybeSingle();
          
          if (planData) {
            // Get latest assignment for this plan (after step deletion)
            const { data: assignmentData } = await supabase
              .from('task_steps_assigned')
              .select(`
                id,
                employee_id,
                assigned_at,
                task_steps!inner(
                  id,
                  social_media_plan_id
                )
              `)
              .eq('task_steps.social_media_plan_id', planId)
              .order('assigned_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const assignedEmployeeId = assignmentData?.employee_id || null;
            
            // Determine new pic_production_id and source
            let newPicProductionId: string | null = null;
            let newPicProductionSource: string | null = null;
            
            if (assignedEmployeeId) {
              newPicProductionId = assignedEmployeeId;
              newPicProductionSource = 'task_steps_assigned';
            } else if (planData.google_drive_link) {
              if (planData.pic_production_source === 'google_drive_link' && planData.pic_production_id) {
                newPicProductionId = planData.pic_production_id;
                newPicProductionSource = 'google_drive_link';
              } else {
                newPicProductionId = null;
                newPicProductionSource = null;
              }
            } else {
              newPicProductionId = null;
              newPicProductionSource = null;
            }
            
            // Update database only if changed
            if (newPicProductionId !== planData.pic_production_id || newPicProductionSource !== planData.pic_production_source) {
              const { error: updateError } = await supabase
                .from('social_media_plans')
                .update({
                  pic_production_id: newPicProductionId,
                  pic_production_source: newPicProductionSource
                })
                .eq('id', planId);
              
              if (updateError) {
                console.error('❌ Error syncing pic_production_id after step deletion:', updateError);
              } else {
                console.log('✅ Synced pic_production_id after step deletion:', {
                  planId,
                  employeeId: newPicProductionId,
                  source: newPicProductionSource
                });
              }
            }
          }
        } catch (syncError) {
          console.error('Error syncing pic_production_id after step deletion:', syncError);
          // Don't fail the whole operation if sync fails
        }
      }

      // Check if task still has steps after deletion
      if (stepData?.task_id) {
        const { data: remainingSteps } = await supabase
          .from('task_steps')
          .select('id')
          .eq('task_id', stepData.task_id)
          .limit(1);

        const { error: updateError } = await supabase
          .from('daily_tasks')
          .update({ has_steps: (remainingSteps?.length || 0) > 0 })
          .eq('id', stepData.task_id);
        
        if (updateError) {
          console.warn('Failed to update has_steps:', updateError);
        }
      }

      toast({
        title: 'Success',
        description: 'Step deleted successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete step',
        variant: 'destructive'
      });
    }
  };

  const reorderTaskSteps = async (taskId: string, stepIds: string[]) => {
    try {
      // Update order for each step
      const updatePromises = stepIds.map((stepId, index) => 
        supabase
          .from('task_steps')
          .update({ order: index + 1 })
          .eq('id', stepId)
      );

      await Promise.all(updatePromises);

      toast({
        title: 'Success',
        description: 'Steps reordered successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error reordering steps:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder steps',
        variant: 'destructive'
      });
    }
  };

  const uploadTaskFile = async (taskId: string, file: File) => {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `task-files/${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath);

      // Get the first task step for this task
      const { data: taskSteps } = await supabase
        .from('task_steps')
        .select('id')
        .eq('task_id', taskId)
        .order('order', { ascending: true })
        .limit(1);

      if (!taskSteps || taskSteps.length === 0) {
        throw new Error('No task steps found for this task');
      }

      // Save file record to database
      const { error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_steps_id: (taskSteps as any)[0].id,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
      
      clearCache(`tasks_${organizationId}`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const uploadTaskStepFile = async (taskStepId: string, file: File) => {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `task-step-files/${taskStepId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath);

      // Save file record to database
      const { error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_steps_id: taskStepId,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const deleteTaskFile = async (fileId: string) => {
    try {
      // First get the file record to get the file path
      const { data: fileRecord, error: fetchError } = await supabase
        .from('task_files')
        .select('file_url')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const fileUrl = (fileRecord as any).file_url;
      const urlParts = fileUrl.split('/');
      const bucketName = urlParts[urlParts.length - 3]; // task-files
      const filePath = urlParts.slice(urlParts.length - 2).join('/'); // task-step-files/stepId/filename

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('task-files')
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  const calculateTaskProgress = (taskId: string): number => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return 0;
    return calculateProgress(task.steps);
  };

  // Deadline extension functions
  const requestDeadlineExtension = async (taskId: string, newDeadline: string, reason: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.due_date) {
        throw new Error('Task or due date not found');
      }

      const { error } = await supabase
        .from('deadline_history')
        .insert({
          task_id: taskId,
          original_deadline: task.due_date,
          new_deadline: newDeadline,
          reason: reason,
          requested_by: (await supabase.auth.getUser()).data.user?.id || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deadline extension request submitted'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error requesting deadline extension:', error);
      toast({
        title: 'Error',
        description: 'Failed to request deadline extension',
        variant: 'destructive'
      });
    }
  };

  const approveDeadlineExtension = async (historyId: string) => {
    try {
      const { error } = await supabase
        .from('deadline_history')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', historyId);

      if (error) throw error;

      // Update the task's due_date to the new deadline
      const { data: historyData } = await supabase
        .from('deadline_history')
        .select('task_id, new_deadline')
        .eq('id', historyId)
        .single();

      if (historyData) {
        await supabase
          .from('daily_tasks')
          .update({ due_date: (historyData as any).new_deadline })
          .eq('id', (historyData as any).task_id);
      }

      toast({
        title: 'Success',
        description: 'Deadline extension approved'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error approving deadline extension:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve deadline extension',
        variant: 'destructive'
      });
    }
  };

  const rejectDeadlineExtension = async (historyId: string) => {
    try {
      const { error } = await supabase
        .from('deadline_history')
        .update({
          status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', historyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deadline extension rejected'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
    } catch (error) {
      console.error('Error rejecting deadline extension:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject deadline extension',
        variant: 'destructive'
      });
    }
  };

  // Real-time subscriptions using custom hook
  // Create a stable refresh callback that calls fetchTasks
  const handleRefresh = useCallback(() => {
    if (organizationId) {
      // fetchTasks is defined in component scope and uses organizationId from closure
      fetchTasks(true);
    }
  }, [organizationId]);

  useTaskRealtime({
    organizationId,
    onRefresh: handleRefresh,
    recentlyUpdatedTasksRef,
  });

  // Initial data fetch
  useEffect(() => {
    if (!organizationId) return;

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTasks(), fetchRecentStepUpdates()]);
      setIsLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // Apply filters when recentStepFilters or recentStepUpdates change
  useEffect(() => {
    setFilteredRecentStepUpdates(filterRecentStepUpdates(recentStepUpdates, recentStepFilters));
  }, [recentStepFilters, recentStepUpdates]);

  // Navigation function to expand specific task and optionally highlight a step
  const navigateToTask = (taskId: string, stepId?: string) => {
    // Expand the task
    setExpandedTasks(prev => new Set([...prev, taskId]));
    
    // Highlight the task
    setHighlightedTask(taskId);
    
    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedTask(null);
    }, 3000);
    
    // If stepId is provided, set search filter to highlight the step
    if (stepId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const step = task.steps.find(s => s.id === stepId);
        if (step) {
          setFilters(prev => ({
            ...prev,
            search: step.title
          }));
          
          // Scroll to specific step after a delay
          setTimeout(() => {
            scrollToStep(stepId);
          }, 200);
        }
      }
    }
  };

  // Function to scroll to specific step
  const scrollToStep = (stepId: string) => {
    const stepElement = document.querySelector(`[data-step-id="${stepId}"]`);
    if (stepElement) {
      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  const value: DailyTaskContextType = {
    tasks,
    summaryData,
    recentStepUpdates,
    filteredRecentStepUpdates,
    recentStepFilters,
    filters,
    isLoading,
    expandedTasks,
    setExpandedTasks,
    highlightedTask,
    setHighlightedTask,
    setFilters,
    setRecentStepFilters,
    addTask,
    updateTask,
    deleteTask,
    addTaskStep,
    updateTaskStep,
    deleteTaskStep,
    assignTaskStep,
    reorderTaskSteps,
    uploadTaskFile,
    uploadTaskStepFile,
    deleteTaskFile,
    calculateTaskProgress,
    requestDeadlineExtension,
    approveDeadlineExtension,
    rejectDeadlineExtension,
    navigateToTask,
    scrollToStep
  };

  return (
    <DailyTaskContext.Provider value={value}>
      {children}
    </DailyTaskContext.Provider>
  );
};
