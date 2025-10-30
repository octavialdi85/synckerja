import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

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

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  files?: TaskFile[];
  links?: TaskLink[];
  history?: TaskStepHistory[];
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
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    dateFilter: ''
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

  const fetchTasks = async () => {
    if (!organizationId) return;

    try {
      console.log('Fetching tasks for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('daily_tasks')
        .select(`
          *,
          task_steps (
            *,
            task_files (*),
            task_step_links (*),
            task_step_history (*),
            assigned_employee:employees!assigned_to(id, full_name, email),
            assigned_by_employee:employees!assigned_by(id, full_name, email)
          ),
          deadline_history (*),
          assigned_employee:employees!assigned_to(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched tasks:', data);
      
      // Calculate progress for each task and synchronize status
      const tasksWithProgress = (data || []).map((task: any) => {
        const progress = calculateProgress(task.task_steps || []);
        const synchronizedStatus = determineStatusFromProgress(progress, task.status);
        
        return {
          ...task,
          steps: (task.task_steps || []).map((step: any) => ({
            ...step,
            files: step.task_files || [],
            links: step.task_step_links || [],
            history: step.task_step_history || []
          })),
          deadline_history: task.deadline_history || [],
          progress_percentage: progress,
          status: synchronizedStatus, // Use synchronized status
          assigned_to_name: (task as any).assigned_employee?.full_name || null,
          files: [] // Initialize empty files array for task level
        };
      });
      
      setTasks(tasksWithProgress);
      
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
        return originalTask && task.status !== originalTask.status;
      });

      if (updatesNeeded.length > 0) {
        console.log('Syncing task statuses in database:', updatesNeeded.map(t => ({ id: t.id, oldStatus: originalTasks.find(ot => ot.id === t.id)?.status, newStatus: t.status })));
        
        // Update status for each task that needs synchronization
        for (const task of updatesNeeded) {
          const { error } = await supabase
            .from('daily_tasks')
            .update({ status: task.status })
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
    // If task is completed or cancelled, keep the current status
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return currentStatus;
    }
    
    // If progress is 0%, status should be pending
    if (progress === 0) {
      return 'pending';
    }
    
    // If progress is 100%, status should be completed
    if (progress === 100) {
      return 'completed';
    }
    
    // If progress is between 0% and 100%, status should be in_progress
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
          assigned_to: data.assigned_to || null,
          objective_id: (data as any).objective_id || null,
          created_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Task added successfully');
      
      toast({
        title: 'Success',
        description: 'Task added successfully'
      });
      
      // Refresh data immediately
      await fetchTasks();
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
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task updated successfully'
      });
      
      // Refresh data immediately
      await fetchTasks();
    } catch (error) {
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
      
      // Refresh data immediately
      await fetchTasks();
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
          order: nextOrder
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Step added successfully'
      });
      
      await fetchTasks();
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
      const { error } = await supabase
        .from('task_steps')
        .update(data)
        .eq('id', stepId);

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
          const newStatus = determineStatusFromProgress(progress, 'pending'); // We'll get the current status from the task
          
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

      toast({
        title: 'Success',
        description: 'Step updated successfully'
      });
      
      await fetchTasks();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive'
      });
    }
  };

  const assignTaskStep = async (stepId: string, employeeId: string | null) => {
    try {
      // Get current user to set assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: currentEmployee } = await supabase
        .from('employees' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      const updateData: any = {
        assigned_to: employeeId,
        assigned_at: employeeId ? new Date().toISOString() : null,
        assigned_by: employeeId ? (currentEmployee as any)?.id : null
      };

      const { error } = await supabase
        .from('task_steps')
        .update(updateData)
        .eq('id', stepId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: employeeId ? 'Step assigned successfully' : 'Step unassigned successfully'
      });
      
      await fetchTasks();
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
      const { error } = await supabase
        .from('task_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Step deleted successfully'
      });
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
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
      
      await fetchTasks();
    } catch (error) {
      console.error('Error rejecting deadline extension:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject deadline extension',
        variant: 'destructive'
      });
    }
  };

  // Real-time subscriptions
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

    // Set up real-time subscriptions
    const tasksChannel = supabase
      .channel('daily-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tasks',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Real-time tasks update:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    const stepsChannel = supabase
      .channel('task-steps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_steps'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const filesChannel = supabase
      .channel('task-files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_files'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const deadlineHistoryChannel = supabase
      .channel('deadline-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadline_history'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(stepsChannel);
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(deadlineHistoryChannel);
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
