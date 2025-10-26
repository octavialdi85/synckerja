import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
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

export interface DailyTaskContextType {
  tasks: Task[];
  summaryData: SummaryData;
  filters: Filters;
  isLoading: boolean;
  setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
  addTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskStep: (taskId: string, title: string) => Promise<void>;
  updateTaskStep: (stepId: string, data: Partial<TaskStep>) => Promise<void>;
  deleteTaskStep: (stepId: string) => Promise<void>;
  reorderTaskSteps: (taskId: string, stepIds: string[]) => Promise<void>;
  uploadTaskFile: (taskId: string, file: File) => Promise<void>;
  deleteTaskFile: (fileId: string) => Promise<void>;
  calculateTaskProgress: (taskId: string) => number;
  requestDeadlineExtension: (taskId: string, newDeadline: string, reason: string) => Promise<void>;
  approveDeadlineExtension: (historyId: string) => Promise<void>;
  rejectDeadlineExtension: (historyId: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    dateFilter: ''
  });
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  // Centralized fetch functions
  const fetchTasks = async () => {
    if (!organizationId) return;

    try {
      console.log('Fetching tasks for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('daily_tasks')
        .select(`
          *,
          task_steps (*),
          task_files (*),
          deadline_history (*),
          assigned_employee:employees!assigned_to(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched tasks:', data);
      
      // Calculate progress for each task
      const tasksWithProgress = (data || []).map(task => ({
        ...task,
        steps: task.task_steps || [],
        files: task.task_files || [],
        deadline_history: task.deadline_history || [],
        progress_percentage: calculateProgress(task.task_steps || []),
        assigned_to_name: (task as any).assigned_employee?.full_name || null
      }));
      
      setTasks(tasksWithProgress);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive'
      });
    }
  };

  const calculateProgress = (steps: TaskStep[]): number => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.is_completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  // Calculate summary data from tasks
  const summaryData: SummaryData = {
    pending: tasks.filter(task => task.status === 'pending').length,
    inProgress: tasks.filter(task => task.status === 'in_progress').length,
    completed: tasks.filter(task => task.status === 'completed').length,
    cancelled: tasks.filter(task => task.status === 'cancelled').length,
    overdue: tasks.filter(task => {
      if (!task.due_date) return false;
      return new Date(task.due_date) < new Date() && task.status !== 'completed';
    }).length,
    totalSteps: tasks.reduce((sum, task) => sum + task.steps.length, 0),
    completedSteps: tasks.reduce((sum, task) => 
      sum + task.steps.filter(step => step.is_completed).length, 0
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
          objective_id: data.objective_id || null,
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
        ? existingSteps[0].order + 1 
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
          .eq('task_id', stepData.task_id);

        const allCompleted = allSteps?.every(step => step.is_completed);
        
        // If step is being completed and all steps are now completed
        if (data.is_completed === true && allCompleted) {
          // Set finish_date when all steps are completed
          await supabase
            .from('daily_tasks')
            .update({ 
              finish_date: new Date().toISOString(),
              status: 'completed'
            })
            .eq('id', stepData.task_id);
        }
        
        // If step is being uncompleted and not all steps are completed anymore
        if (data.is_completed === false && !allCompleted) {
          // Clear finish_date when any step is unchecked
          await supabase
            .from('daily_tasks')
            .update({ 
              finish_date: null,
              status: 'in_progress'
            })
            .eq('id', stepData.task_id);
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

      // Save file record to database
      const { error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
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
      const { error } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

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
          .update({ due_date: historyData.new_deadline })
          .eq('id', historyData.task_id);
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
      await fetchTasks();
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

  const value: DailyTaskContextType = {
    tasks,
    summaryData,
    filters,
    isLoading,
    setFilters,
    addTask,
    updateTask,
    deleteTask,
    addTaskStep,
    updateTaskStep,
    deleteTaskStep,
    reorderTaskSteps,
    uploadTaskFile,
    deleteTaskFile,
    calculateTaskProgress,
    requestDeadlineExtension,
    approveDeadlineExtension,
    rejectDeadlineExtension
  };

  return (
    <DailyTaskContext.Provider value={value}>
      {children}
    </DailyTaskContext.Provider>
  );
};
