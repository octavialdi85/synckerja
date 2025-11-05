import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { retryableQuery } from '@/integrations/supabase/retry';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { debounce, throttle, getCached, setCache, clearCache, trackQuery } from './utils/optimizationUtils';

export interface TaskLink {
  id: string;
  task_step_id: string;
  title: string;
  url: string;
  created_at: string;
}

export interface TaskStepHistory {
  id: string;
  task_step_id: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  blocker_type?: string;
  blocker_severity?: string;
  brief_type?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface TaskSubStep {
  id: string;
  parent_step_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  assigned_employee?: {
    id: string;
    full_name: string;
    email?: string;
  } | null;
}

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  files?: TaskFile[];
  links?: TaskLink[];
  history?: TaskStepHistory[];
  assigned_to?: string | null;
  assigned_employee?: {
    id: string;
    full_name: string;
    email?: string;
  } | null;
  has_assigned_substeps?: boolean; // True if this step has sub-steps assigned to current user
  sub_steps?: TaskSubStep[]; // Sub-steps for this step
}

export interface TaskFile {
  id: string;
  task_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

export interface DeadlineHistory {
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

export interface RecentStepUpdate {
  id: string;
  task_id: string;
  step_id: string;
  step_title: string;
  task_title: string;
  is_completed: boolean;
  updated_at: string;
  action: 'created' | 'updated' | 'completed' | 'reopened';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  finish_date: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  created_by: string;
  assigned_to?: string;
  assigned_to_name?: string | null;
  has_reminder?: boolean;
  has_steps?: boolean;
  has_substeps?: boolean;
  steps: TaskStep[];
  files: TaskFile[];
  deadline_history: DeadlineHistory[];
  progress_percentage: number;
}

interface SummaryData {
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  totalSteps: number;
  completedSteps: number;
}

interface Filters {
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

interface RecentStepFilters {
  dateRange: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  actionType: 'all' | 'completed' | 'updated' | 'created' | 'reopened';
  customStartDate?: string;
  customEndDate?: string;
}

export interface DailyTaskContextType {
  tasks: Task[];
  summaryData: SummaryData;
  recentStepUpdates: RecentStepUpdate[];
  filteredRecentStepUpdates: RecentStepUpdate[];
  recentStepFilters: RecentStepFilters;
  filters: Filters;
  isLoading: boolean;
  expandedTasks: Set<string>;
  setExpandedTasks: (expandedTasks: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  highlightedTask: string | null;
  setHighlightedTask: (taskId: string | null) => void;
  setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
  setRecentStepFilters: (filters: RecentStepFilters | ((prev: RecentStepFilters) => RecentStepFilters)) => void;
  addTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskStep: (taskId: string, title: string) => Promise<void>;
  updateTaskStep: (stepId: string, data: Partial<TaskStep>) => Promise<void>;
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
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    dateFilter: '',
    dateRange: undefined,
    customStartDate: undefined,
    customEndDate: undefined,
    pic: '',
    myTask: 'my_task' // Default to "My Task"
  });
  const [recentStepFilters, setRecentStepFilters] = useState<RecentStepFilters>({
    dateRange: 'today',
    actionType: 'all'
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  // Filter recent step updates based on current filters
  const filterRecentStepUpdates = (updates: RecentStepUpdate[], filters: RecentStepFilters) => {
    let filtered = [...updates];

    // Filter by action type
    if (filters.actionType !== 'all') {
      filtered = filtered.filter(update => update.action === filters.actionType);
    }

    // Filter by date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    filtered = filtered.filter(update => {
      const updateDate = new Date(update.updated_at);
      
      switch (filters.dateRange) {
        case 'today':
          return updateDate >= today;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return updateDate >= yesterday && updateDate < today;
        case 'this_week':
          const weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          return updateDate >= weekStart;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return updateDate >= monthStart;
        case 'last_month':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          return updateDate >= lastMonthStart && updateDate < lastMonthEnd;
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            return updateDate >= startDate && updateDate <= endDate;
          }
          return true;
        default:
          return true;
      }
    });

    return filtered;
  };

  // Centralized fetch functions
  const fetchRecentStepUpdates = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('task_steps')
        .select(`
          id,
          task_id,
          title,
          is_completed,
          updated_at,
          daily_tasks!inner(title)
        `)
        .eq('daily_tasks.organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const recentUpdates: RecentStepUpdate[] = (data || []).map((step: any) => ({
        id: step.id,
        task_id: step.task_id,
        step_id: step.id, // Use step id as step_id
        step_title: step.title,
        task_title: step.daily_tasks.title,
        is_completed: step.is_completed,
        updated_at: step.updated_at,
        action: step.is_completed ? 'completed' : 'updated'
      }));

      setRecentStepUpdates(recentUpdates);
      // Apply current filters to the new data
      setFilteredRecentStepUpdates(filterRecentStepUpdates(recentUpdates, recentStepFilters));
    } catch (error) {
      console.error('Error fetching recent step updates:', error);
    }
  };

  const fetchTasks = async (force = false) => {
    if (!organizationId) return;

    try {
      console.log('🔍 Fetching tasks for organization:', organizationId);
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

      console.log('👤 Current user:', user.id);
      console.log('👨‍💼 Current employee:', currentEmployee?.id);

      // Get tasks assigned to current user at TASK level
      let assignedTaskIds: string[] = [];
      if (currentEmployee?.id) {
        const { data: assignedTasks } = await supabase
          .from('daily_tasks_assigned')
          .select('daily_task_id')
          .eq('employee_id', currentEmployee.id);
        
        assignedTaskIds = (assignedTasks || []).map((a: any) => a.daily_task_id);
        console.log('📋 Task-level assigned IDs:', assignedTaskIds);
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
          console.log('📋 Step-level assigned task IDs:', stepAssignedTaskIds);
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
          console.log('📋 Sub-step-level assigned task IDs:', subStepAssignedTaskIds);
        }
      }

      // Combine task-level, step-level, and sub-step-level assignments
      const allAssignedTaskIds = [...new Set([...assignedTaskIds, ...stepAssignedTaskIds, ...subStepAssignedTaskIds])];
      console.log('📋 Combined assigned task IDs (task + step + sub-step):', allAssignedTaskIds);
      
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
      
      console.log('✅ Fetched tasks (basic data):', data);
      console.log('📊 Task count:', data?.length || 0);
      
      // Debug: Log if no tasks found
      if (!data || data.length === 0) {
        console.warn('⚠️ No tasks found for organization:', organizationId);
        setTasks([]);
        setCache(cacheKey, []);
        return;
      }

      // Fetch task steps separately to avoid timeout
      const taskIds = data.map(task => task.id);
      console.log('🔍 Fetching task steps for tasks:', taskIds);
      
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

      console.log('✅ Fetched task steps:', stepsData?.length || 0);

      // Fetch task assignments separately to get PIC information
      console.log('🔍 Fetching task assignments for tasks:', taskIds);
      
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

      console.log('✅ Fetched task assignments:', assignmentsData?.length || 0);

      // Fetch step assignments separately to get PIC information for each step
      const stepIds = (stepsData || []).map(s => s.id);
      console.log('🔍 Fetching step assignments for steps:', stepIds.length);
      
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
            employee:employees!employee_id(id, full_name, email)
          `)
          .in('task_step_id', stepIds)
          .order('assigned_at', { ascending: false });

        if (stepAssignsError) {
          console.error('❌ Error fetching step assignments:', stepAssignsError);
        } else {
          stepAssignmentsData = stepAssigns || [];
          console.log('✅ Fetched step assignments:', stepAssignmentsData.length);
        }
      }

      // Fetch ALL sub-steps (task_steps_to_steps) for all steps
      console.log('🔍 Fetching sub-steps (task_steps_to_steps) for steps:', stepIds.length);
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
          console.log('✅ Fetched sub-steps:', subStepsData.length);
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
          console.log('✅ Fetched sub-step assignments:', subStepAssignmentsData.length);
          
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
          console.log('📋 Parent step IDs with assigned sub-steps:', subStepParentIds);
        }
      }

      // Group step assignments by task_step_id (only keep the latest one per step)
      const stepAssignmentsByStepId: Record<string, any> = {};
      stepAssignmentsData.forEach(assignment => {
        if (!stepAssignmentsByStepId[assignment.task_step_id]) {
          stepAssignmentsByStepId[assignment.task_step_id] = assignment;
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
          assigned_employee: stepAssignment?.employee || null,
          has_assigned_substeps: hasAssignedSubSteps, // Flag to show step if it has assigned sub-steps
          sub_steps: subSteps // Include sub-steps data
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
            files: [], // Load separately on demand
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

  const calculateProgress = (steps: TaskStep[]): number => {
    if (!steps || !Array.isArray(steps) || steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step && step.is_completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const determineStatusFromProgress = (progress: number, currentStatus: string): string => {
    // Cancelled remains cancelled
    if (currentStatus === 'cancelled') return 'cancelled';
    if (progress >= 100) return 'completed';
    if (progress <= 0) return 'pending';
    return 'in_progress';
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

  const updateTaskStep = async (stepId: string, data: Partial<TaskStep>) => {
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

      if (stepData) {
        // Get all steps for this task
        const { data: allSteps } = await supabase
          .from('task_steps')
          .select('is_completed')
          .eq('task_id', (stepData as any).task_id);

        if (allSteps) {
          // Calculate progress and determine new status
          const progress = calculateProgress(allSteps as any);
          const newStatus = determineStatusFromProgress(progress, 'pending');
          
          // Get current task status
          const { data: currentTask } = await supabase
            .from('daily_tasks')
            .select('status')
            .eq('id', (stepData as any).task_id)
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
            .eq('id', (stepData as any).task_id);
        }
      }

      // Record history if completion status changed
      const afterCompleted = typeof data.is_completed === 'boolean' ? data.is_completed : (before as any)?.is_completed;
      if (typeof data.is_completed === 'boolean' && before && (before as any).is_completed !== data.is_completed) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any)
          .from('task_step_history')
          .insert({
            task_step_id: stepId,
            action_type: 'status_change',
            old_value: (before as any).is_completed ? 'completed' : 'pending',
            new_value: afterCompleted ? 'completed' : 'pending',
            description: afterCompleted ? 'Step completed' : 'Step reopened',
            created_by: user?.id || null,
          });
      }

      toast({
        title: 'Success',
        description: 'Step updated successfully'
      });
      
      clearCache(`tasks_${organizationId}_*`);
      await fetchTasks(true);
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
        // fetch organization id via step -> task
        const { data: stepTask } = await supabase
          .from('task_steps')
          .select('task_id')
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
      } else {
        // unassign by deleting assignment rows for this step
        console.log('🔓 Unassigning step:', stepId);
        const { error } = await supabase
          .from('task_steps_assigned')
          .delete()
          .eq('task_step_id', stepId);
        if (error) throw error;
        console.log('✅ Step unassigned successfully');
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
      // Get task_id before deleting
      const { data: stepData } = await supabase
        .from('task_steps')
        .select('task_id')
        .eq('id', stepId)
        .single();

      const { error } = await supabase
        .from('task_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

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

  // Real-time subscriptions (OPTIMIZED - Reduced channels & added throttling)
  useEffect(() => {
    if (!organizationId) return;

    // Initial data fetch
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchRecentStepUpdates()
      ]);
      setIsLoading(false);
    };

    loadData();

    // Create throttled refresh function (max once every 5 seconds - INCREASED)
    const throttledRefresh = throttle(() => {
      console.log('🔄 Throttled refresh triggered');
      fetchTasks(true); // Force refresh to bypass cache
      clearCache(`tasks_${organizationId}_*`); // Clear cache for all users to get fresh data
    }, 5000); // 5 seconds instead of 3 to save more IO

    // OPTIMIZED: Only subscribe to main tasks table
    // All changes to steps, files, etc will be reflected through tasks
    const tasksChannel = supabase
      .channel('daily-tasks-main')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tasks',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📡 Real-time tasks update:', payload.eventType);
          
          // Skip refresh if this task was recently updated by us (optimization for status updates)
          const taskId = payload.new?.id || payload.old?.id;
          if (taskId && recentlyUpdatedTasksRef.current.has(taskId)) {
            console.log('⏭️ Skipping refresh for recently updated task:', taskId);
            return;
          }
          
          throttledRefresh();
        }
      )
      .subscribe();

    // DISABLED: Step subscription to save IO budget
    // If you need real-time step updates, uncomment below
    // const stepsChannel = supabase
    //   .channel('task-steps-main')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'task_steps'
    //     },
    //     (payload) => {
    //       console.log('📡 Real-time step update:', payload.eventType);
    //       throttledRefresh();
    //     }
    //   )
    //   .subscribe();

    // REMOVED: filesChannel - not critical for real-time
    // REMOVED: deadlineHistoryChannel - not critical for real-time
    // These will be fetched when tasks are refreshed

    console.log('✅ Real-time subscriptions setup (OPTIMIZED)');

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      supabase.removeChannel(tasksChannel);
      // supabase.removeChannel(stepsChannel); // Disabled
    };
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
