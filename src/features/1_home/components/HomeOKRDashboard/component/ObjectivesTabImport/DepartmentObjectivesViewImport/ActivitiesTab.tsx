import React, { useState, useEffect, useRef } from 'react';
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
  Paperclip,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  History,
  Clock3,
  GripVertical,
  Target,
  X,
  Upload
} from 'lucide-react';
// Force recompile
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/features/ui/dialog';
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
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

interface ActivityFile {
  id: string;
  activity_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

interface ActivityStep {
  id: string;
  activity_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
  files: ActivityFile[];
}

interface Activity {
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
  objective_id: string;
  created_by: string;
  assigned_to_name?: string;
  steps: ActivityStep[];
  files: ActivityFile[];
  progress_percentage: number;
}

// ActivityStep Component - Mirip dengan TaskStep dari daily task
interface ActivityStepProps {
  step: ActivityStep;
  index: number;
  onUpdateStep: (stepId: string, updates: Partial<ActivityStep>) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onUploadFile: (stepId: string, file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

const ActivityStep = ({ step, index, onUpdateStep, onDeleteStep, onUploadFile, onDeleteFile }: ActivityStepProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [showFiles, setShowFiles] = useState(step.files && step.files.length > 0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update showFiles when step.files changes
  useEffect(() => {
    if (step.files && step.files.length > 0) {
      setShowFiles(true);
    }
  }, [step.files]);

  const handleToggleComplete = async () => {
    await onUpdateStep(step.id, { is_completed: !step.is_completed });
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== step.title) {
      await onUpdateStep(step.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(step.title);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      await onDeleteStep(step.id);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await onUploadFile(step.id, file);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = step.files?.find(f => f.id === fileId);
    const fileName = file?.filename || 'this file';
    
    if (window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      await onDeleteFile(fileId);
    }
  };

  return (
    <div>
      <Draggable draggableId={step.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`flex items-center gap-2 p-2 bg-white rounded-md hover:bg-blue-50 transition-colors border border-blue-100 ${
              snapshot.isDragging ? 'shadow-lg bg-blue-100' : ''
            }`}
          >
            <button
              onClick={handleToggleComplete}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {step.is_completed ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div
              {...provided.dragHandleProps}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-8 px-2 text-green-600 hover:text-green-700"
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 px-2 text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <span className={`flex-1 text-sm ${
                  step.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                }`}>
                  {step.title}
                </span>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFiles(!showFiles)}
                    className={`h-6 w-6 p-0 hover:text-gray-600 ${
                      step.files && step.files.length > 0 
                        ? 'text-blue-500' 
                        : 'text-gray-400'
                    }`}
                    title={`Toggle files ${step.files && step.files.length > 0 ? `(${step.files.length})` : ''}`}
                  >
                    <Paperclip className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Draggable>
      
      {/* File Upload and Display Section - Outside Draggable */}
      {showFiles && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          {/* File Upload */}
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </div>
              )}
            </Button>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {step.files && step.files.length > 0 ? (
              step.files.map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-200">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{file.filename}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Open file in popup instead of new window
                        const popup = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                        if (popup) {
                          popup.document.write(`
                            <html>
                              <head><title>${file.filename}</title></head>
                              <body style="margin:0; padding:20px; font-family: Arial, sans-serif;">
                                <h2>${file.filename}</h2>
                                <iframe src="${file.file_url}" width="100%" height="500px" style="border:none;"></iframe>
                              </body>
                            </html>
                          `);
                        }
                      }}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                      title="View file"
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      title="Delete file"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic text-center">No files attached</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ActivitiesTabProps {
  objectiveId: string;
  objectiveTitle: string;
}

export const ActivitiesTab = ({ objectiveId, objectiveTitle }: ActivitiesTabProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddStepDialog, setShowAddStepDialog] = useState<{ isOpen: boolean; activityId: string | null; activityTitle: string }>({ 
    isOpen: false, 
    activityId: null, 
    activityTitle: '' 
  });
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: null as Date | null
  });
  const [newStep, setNewStep] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);

  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const { data: currentEmployee, isLoading: isLoadingEmployee } = useCurrentEmployee();
  
  console.log('🏢 Organization ID:', organizationId);
  console.log('👤 Employee loading state:', { isLoadingEmployee, hasEmployee: !!currentEmployee });

  // Fetch activities for this objective
  const fetchActivities = async () => {
    if (!organizationId || !objectiveId) return;

    try {
      setIsLoading(true);
      console.log('🔄 Starting fetchActivities...', { organizationId, objectiveId });
      
      const startTime = performance.now();
      
      // First, check if activities table exists, if not create activities from daily_tasks
      const { data, error } = await supabase
        .from('daily_tasks')
        .select(`
          *,
          task_steps (
            *,
            task_files (*)
          ),
          assigned_employee:employees!assigned_to(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: false });

      const queryTime = performance.now() - startTime;
      console.log('⏱️ Query completed in:', queryTime, 'ms');
      console.log('📊 Data received:', data?.length || 0, 'activities');

      if (error) throw error;
      
      // Transform daily_tasks to activities format
      const transformStartTime = performance.now();
      const transformedActivities = (data || []).map(task => {
        const steps = ((task as any).task_steps || []).map((step: any) => ({
          ...step,
          activity_id: (task as any).id,
          files: step.task_files || []
        }));
        
        console.log(`📁 Activity ${(task as any).id} files per step:`, {
          stepsCount: steps.length,
          filesPerStep: steps.map(s => ({ stepId: s.id, stepTitle: s.title, fileCount: s.files?.length || 0 }))
        });
        
        return {
          ...(task as any),
          activity_id: (task as any).id,
          steps: steps,
          files: [], // Files are now displayed at step level, not activity level
          progress_percentage: calculateProgress(steps),
          assigned_to_name: (task as any).assigned_employee?.full_name || 'Unassigned'
        };
      });
      
      const transformTime = performance.now() - transformStartTime;
      console.log('🔄 Data transformation completed in:', transformTime, 'ms');
      console.log('📋 Transformed activities:', transformedActivities.length);
      
      setActivities(transformedActivities);
      
      const totalTime = performance.now() - startTime;
      console.log('✅ fetchActivities completed in:', totalTime, 'ms');
    } catch (error) {
      console.error('❌ Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (steps: ActivityStep[]) => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.is_completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { organizationId, objectiveId });
    if (organizationId && objectiveId) {
      fetchActivities();
    } else {
      console.log('⏸️ Skipping fetchActivities - missing dependencies');
    }
  }, [organizationId, objectiveId]);

  const toggleActivityExpansion = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const handleStatusToggle = async (activityId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const { error } = await (supabase as any)
        .from('daily_tasks')
        .update({ 
          status: newStatus,
          finish_date: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', activityId);

      if (error) throw error;
      
      await fetchActivities();
      toast({
        title: 'Success',
        description: `Activity marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating activity status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update activity status',
        variant: 'destructive',
      });
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.title.trim() || !organizationId || isCreating) return;

    // Check if current employee data is available
    if (!currentEmployee) {
      toast({
        title: 'Error',
        description: 'Employee profile not found. Please ensure you are logged in properly.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      console.log('Creating activity with auto-assignment to:', (currentEmployee as any).full_name, (currentEmployee as any).id);

      const { data, error } = await (supabase as any)
        .from('daily_tasks')
        .insert({
          title: newActivity.title.trim(),
          description: newActivity.description.trim() || null,
          priority: newActivity.priority,
          due_date: newActivity.due_date ? format(newActivity.due_date, 'yyyy-MM-dd') : null,
          status: 'pending',
          organization_id: organizationId,
          objective_id: objectiveId || null, // Allow null if objective doesn't exist
          created_by: userData.user?.id || null,
          assigned_to: (currentEmployee as any).id, // Auto-assign to current employee
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Activity created successfully and assigned to:', (currentEmployee as any).full_name);

      // Reset form
      setNewActivity({
        title: '',
        description: '',
        priority: 'medium',
        due_date: null
      });
      
      setShowCreateDialog(false);
      await fetchActivities();
      
      toast({
        title: 'Success',
        description: `Activity created and assigned to ${(currentEmployee as any).full_name}`,
      });
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create activity',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Add step function following Daily Task pattern exactly
  const addActivityStep = async (taskId: string, title: string) => {
    try {
      console.log('🔍 Starting addActivityStep:', { taskId, title });

      // Get current max order for this task
      const { data: existingSteps, error: selectError } = await (supabase as any)
        .from('task_steps')
        .select('order')
        .eq('task_id', taskId)
        .order('order', { ascending: false })
        .limit(1);

      if (selectError) {
        console.error('❌ Error getting existing steps:', selectError);
        throw selectError;
      }

      const nextOrder = existingSteps && existingSteps.length > 0 
        ? existingSteps[0].order + 1 
        : 1;

      console.log('📊 Order calculation:', { existingSteps, nextOrder });

      // Verify task exists and user has access
      const { data: taskCheck, error: taskError } = await (supabase as any)
        .from('daily_tasks')
        .select('id, title, organization_id')
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('❌ Error checking task access:', taskError);
        throw new Error('Cannot access task. Please check your permissions.');
      }

      console.log('✅ Task access verified:', taskCheck);

      const { data: insertedStep, error: insertError } = await (supabase as any)
        .from('task_steps')
        .insert({
          task_id: taskId,
          title,
          is_completed: false,
          order: nextOrder
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting step:', insertError);
        throw insertError;
      }

      console.log('✅ Step inserted successfully:', insertedStep);

      toast({
        title: 'Success',
        description: 'Step added successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('💥 Error in addActivityStep:', error);
      
      let errorMessage = 'Failed to add step';
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'Permission denied. Please check your access rights.';
        } else if (error.message.includes('RLS')) {
          errorMessage = 'Security policy violation. Please ensure you are logged in.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleAddStep = async () => {
    if (!newStep.trim() || !showAddStepDialog.activityId || isAddingStep) {
      console.log('Validation failed:', { newStep: newStep.trim(), activityId: showAddStepDialog.activityId, isAddingStep });
      return;
    }

    setIsAddingStep(true);

    try {
      await addActivityStep(showAddStepDialog.activityId, newStep.trim());

      // Reset form
      setNewStep('');
      setShowAddStepDialog({ isOpen: false, activityId: null, activityTitle: '' });
    } catch (error) {
      // Error already handled in addActivityStep
      console.error('Error in handleAddStep:', error);
    } finally {
      setIsAddingStep(false);
    }
  };

  const handleStepToggle = async (stepId: string, isCompleted: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('task_steps')
        .update({ is_completed: !isCompleted })
        .eq('id', stepId);

      if (error) throw error;
      
      await fetchActivities();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive',
      });
    }
  };

  // New functions for ActivityStep component
  const updateActivityStep = async (stepId: string, updates: Partial<ActivityStep>) => {
    try {
      const { error } = await (supabase as any)
        .from('task_steps')
        .update(updates)
        .eq('id', stepId);

      if (error) throw error;
      
      await fetchActivities();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive',
      });
    }
  };

  const deleteActivityStep = async (stepId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('task_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Step deleted successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete step',
        variant: 'destructive',
      });
    }
  };

  const handleDateChange = async (activityId: string, date: Date) => {
    try {
      const { error } = await (supabase as any)
        .from('daily_tasks')
        .update({ due_date: format(date, 'yyyy-MM-dd') })
        .eq('id', activityId);

      if (error) throw error;
      
      setDatePickerOpen(null);
      await fetchActivities();
    } catch (error) {
      console.error('Error updating due date:', error);
      toast({
        title: 'Error',
        description: 'Failed to update due date',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      
      await fetchActivities();
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete activity',
        variant: 'destructive',
      });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const activityId = destination.droppableId.replace('steps-', '');
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const sortedSteps = activity.steps.sort((a, b) => a.order - b.order);
    const newSteps = Array.from(sortedSteps);
    const [removed] = newSteps.splice(source.index, 1);
    newSteps.splice(destination.index, 0, removed);

    // Update order in database
    try {
      const updates = newSteps.map((step, index) => ({
        id: step.id,
        order: index + 1
      }));

      for (const update of updates) {
        await (supabase as any)
          .from('task_steps')
          .update({ order: update.order })
          .eq('id', update.id);
      }

      await fetchActivities();
    } catch (error) {
      console.error('Error reordering steps:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder steps',
        variant: 'destructive',
      });
    }
  };

  // File upload and delete functions
  const uploadStepFile = async (stepId: string, file: File) => {
    try {
      console.log('📁 Uploading file to step:', stepId);
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `activity-step-files/${stepId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath);

      // Save file record to database
      console.log('💾 Saving file record to database:', {
        task_steps_id: stepId,
        filename: file.name,
        file_size: file.size
      });
      
      const { error: dbError } = await (supabase as any)
        .from('task_files')
        .insert({
          task_steps_id: stepId,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size
        });

      if (dbError) {
        console.error('❌ Error saving file record:', dbError);
        throw dbError;
      }
      
      console.log('✅ File uploaded successfully to step:', stepId);

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const uploadActivityFile = async (activityId: string, file: File) => {
    try {
      // First, find or create a step for this activity to attach files to
      let stepId = null;
      
      // Check if activity has any steps
      const activity = activities.find(a => a.id === activityId);
      console.log('🔍 Activity found for file upload:', { 
        activityId, 
        hasActivity: !!activity, 
        stepsCount: activity?.steps?.length || 0,
        stepIds: activity?.steps?.map(s => s.id) || []
      });
      
      if (activity && activity.steps && activity.steps.length > 0) {
        // Use the first step's ID
        stepId = activity.steps[0].id;
        console.log('✅ Using existing step ID:', stepId);
      } else {
        // Create a default step for file uploads
        console.log('🆕 Creating new step for file uploads...');
        const { data: stepData, error: stepError } = await (supabase as any)
          .from('task_steps')
          .insert({
            task_id: activityId,
            title: 'File Attachments',
            is_completed: false,
            order: 0
          })
          .select()
          .single();
          
        if (stepError) {
          console.error('❌ Error creating step:', stepError);
          throw stepError;
        }
        stepId = stepData.id;
        console.log('✅ Created new step ID:', stepId);
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `activity-files/${activityId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath);

      // Save file record to database
      console.log('💾 Saving file record to database:', {
        task_steps_id: stepId,
        filename: file.name,
        file_size: file.size
      });
      
      const { error: dbError } = await (supabase as any)
        .from('task_files')
        .insert({
          task_steps_id: stepId,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size
        });

      if (dbError) {
        console.error('❌ Error saving file record:', dbError);
        throw dbError;
      }
      
      console.log('✅ File record saved successfully');

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const deleteStepFile = async (fileId: string) => {
    try {
      console.log('🗑️ Deleting file:', fileId);
      
      // Get file info before deleting for storage cleanup
      const fileToDelete = activities
        .flatMap(activity => activity.steps)
        .flatMap(step => step.files || [])
        .find(file => file.id === fileId);

      // Delete from database
      const { error: dbError } = await (supabase as any)
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('❌ Error deleting file from database:', dbError);
        throw dbError;
      }

      // Delete from storage if file exists
      if (fileToDelete?.file_url) {
        try {
          const url = new URL(fileToDelete.file_url);
          const filePath = url.pathname.split('/').slice(3).join('/');
          
          const { error: storageError } = await supabase.storage
            .from('task-files')
            .remove([filePath]);

          if (storageError) {
            console.warn('⚠️ Failed to delete file from storage:', storageError);
          } else {
            console.log('✅ File deleted from storage');
          }
        } catch (storageError) {
          console.warn('⚠️ Failed to delete file from storage:', storageError);
        }
      }

      console.log('✅ File deleted successfully');

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  const deleteActivityFile = async (fileId: string) => {
    try {
      // Get file info before deleting for storage cleanup
      const fileToDelete = activities
        .flatMap(activity => activity.files)
        .find(file => file.id === fileId);

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Delete from storage if file exists
      if (fileToDelete?.file_url) {
        try {
          const url = new URL(fileToDelete.file_url);
          const filePath = url.pathname.split('/').slice(3).join('/');
          
          const { error: storageError } = await supabase.storage
            .from('task-files')
            .remove([filePath]);

          if (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
          }
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
        }
      }

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });
      
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
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
      <Badge className={`${variants[status] || ''} px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap`}>
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
      <Badge className={`${variants[priority] || ''} px-2 py-1 text-xs font-medium rounded-md`}>
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Loading activities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <TooltipProvider>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Activities</h3>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {activities.length} Activities
                </Badge>
              </div>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Activities for: <span className="font-medium">{objectiveTitle}</span>
            </p>
          </div>

          {/* Activities Table */}
          <div className="flex-1 overflow-auto">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <Target className="h-12 w-12 text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h4>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Create activities to break down this objective into actionable tasks
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Activity
                </Button>
              </div>
            ) : (
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px' }}>
                      <span className="sr-only">Expand</span>
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px' }}>
                      <span className="sr-only">Complete</span>
                    </TableHead>
                    <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '250px' }}>
                      Activity Title
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px' }}>
                      PIC
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px' }}>
                      Due Date
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '90px' }}>
                      Priority
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px' }}>
                      Status
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px' }}>
                      Progress
                    </TableHead>
                    <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '100px' }}>
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => {
                    const isExpanded = expandedActivities.has(activity.id);
                    const isOverdueActivity = isOverdue(activity.due_date, activity.status);
                    
                    return (
                      <React.Fragment key={activity.id}>
                        {/* Main Activity Row */}
                        <TableRow className="w-full hover:bg-gray-50">
                          {/* Expand/Collapse Button */}
                          <TableCell className="px-2 py-3 text-center" style={{ width: '40px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActivityExpansion(activity.id)}
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
                          <TableCell className="px-2 py-3 text-center" style={{ width: '40px' }}>
                            <button
                              onClick={() => handleStatusToggle(activity.id, activity.status)}
                              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {activity.status === 'completed' ? (
                                <CheckSquare className="w-5 h-5 text-green-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </TableCell>

                          {/* Activity Title */}
                          <TableCell className="px-2 py-3" style={{ width: '250px' }}>
                            <div 
                              className={`text-sm font-medium cursor-pointer hover:text-blue-600 ${
                                activity.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}
                              onClick={() => toggleActivityExpansion(activity.id)}
                              title="Click to expand"
                            >
                              {activity.title}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {activity.steps.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3" />
                                  {activity.steps.filter(s => s.is_completed).length}/{activity.steps.length} steps
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* PIC (Person In Charge) */}
                          <TableCell className="px-2 py-3 text-center" style={{ width: '120px' }}>
                            <div className="flex items-center justify-center">
                              {activity.assigned_to_name && activity.assigned_to_name !== 'Unassigned' ? (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-gray-900 font-medium">
                                    {activity.assigned_to_name}
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
                          <TableCell className="px-2 py-3 text-center" style={{ width: '130px' }}>
                            <Popover 
                              open={datePickerOpen === activity.id} 
                              onOpenChange={(open) => setDatePickerOpen(open ? activity.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={`h-auto p-1 hover:bg-gray-100 rounded-md transition-colors ${
                                    isOverdueActivity ? 'text-red-600 font-medium hover:bg-red-50' : 'text-gray-600'
                                  }`}
                                >
                                  {activity.due_date ? (
                                    <div className="flex flex-col items-center">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-sm">{formatDate(activity.due_date)}</span>
                                      </div>
                                      {isOverdueActivity && (
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
                                    selected={activity.due_date ? new Date(activity.due_date) : undefined}
                                    onSelect={(date) => handleDateChange(activity.id, date)}
                                    className="border-0 shadow-none"
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>

                          {/* Priority */}
                          <TableCell className="px-2 py-3 text-center" style={{ width: '90px' }}>
                            {getPriorityBadge(activity.priority)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-2 py-3 text-center" style={{ width: '130px' }}>
                            {getStatusBadge(activity.status)}
                          </TableCell>

                          {/* Progress */}
                          <TableCell className="px-2 py-3" style={{ width: '120px' }}>
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-xs text-gray-500">
                                {activity.steps.length > 0 ? `${activity.progress_percentage}%` : 'No steps'}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    activity.progress_percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${activity.steps.length > 0 ? activity.progress_percentage : 0}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                
                          {/* Actions */}
                          <TableCell className="px-2 py-3 text-center" style={{ width: '100px' }}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Content Row */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="w-full px-4 py-4 bg-blue-50 border-t border-blue-200">
                              {activity.description && (
                                <div className="mb-4">
                                  <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                                  <p className="text-sm text-gray-600">{activity.description}</p>
                                </div>
                              )}
                              
                              <div className="w-full space-y-4">
                                {/* Steps Section */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                      <CheckSquare className="w-4 h-4 text-blue-600" />
                                      Steps ({activity.steps.filter(s => s.is_completed).length}/{activity.steps.length})
                                    </h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setShowAddStepDialog({ isOpen: true, activityId: activity.id, activityTitle: activity.title });
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      title="Add a new step to this activity"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add Step
                                    </Button>
                                  </div>
                                  
                                  <Droppable droppableId={`steps-${activity.id}`}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`space-y-2 min-h-[50px] ${
                                          snapshot.isDraggingOver ? 'bg-blue-100 rounded-lg' : ''
                                        }`}
                                      >
                                        {activity.steps.length === 0 ? (
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                            <CheckSquare className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                                            <p className="text-sm font-medium text-blue-900 mb-1">No steps yet</p>
                                            <p className="text-xs text-blue-700">
                                              Break down this activity into smaller steps for better tracking
                                            </p>
                                            <p className="text-xs text-blue-600 mt-2">
                                              👆 Click "Add Step" button above to get started
                                            </p>
                                          </div>
                                        ) : (
                                          activity.steps
                                            .sort((a, b) => a.order - b.order)
                                            .map((step, index) => (
                                              <ActivityStep
                                                key={step.id}
                                                step={step}
                                                index={index}
                                                onUpdateStep={updateActivityStep}
                                                onDeleteStep={deleteActivityStep}
                                                onUploadFile={uploadStepFile}
                                                onDeleteFile={deleteStepFile}
                                              />
                                            ))
                                        )}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>

                                </div>

                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </table>
            )}
          </div>
        </div>

        {/* Create Activity Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          if (!open && !isCreating) {
            setShowCreateDialog(false);
            // Reset form when closing
            setNewActivity({
              title: '',
              description: '',
              priority: 'medium',
              due_date: null
            });
          }
        }}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">Create New Activity</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Activity Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Activity Title
                </Label>
                <Input
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="Enter activity title..."
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Enter activity description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Priority and Due Date Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                    Priority
                  </Label>
                  <select
                    id="priority"
                    value={newActivity.priority}
                    onChange={(e) => setNewActivity({ ...newActivity, priority: e.target.value as any })}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-sm font-medium text-gray-700">
                    Due Date
                  </Label>
                  <div className="relative">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-10 px-3 py-2 justify-start text-left font-normal border-gray-300 hover:border-gray-400"
                        >
                          <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                          {newActivity.due_date ? (
                            format(newActivity.due_date, 'MMM dd, yyyy')
                          ) : (
                            <span className="text-gray-500">Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border border-gray-200 rounded-lg shadow-lg" align="start">
                        <div className="p-3">
                          <CustomDatePicker
                            selected={newActivity.due_date}
                            onSelect={(date) => setNewActivity({ ...newActivity, due_date: date })}
                            className="border-0 shadow-none"
                          />
                          {newActivity.due_date && (
                            <div className="flex justify-center pt-2 border-t mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNewActivity({ ...newActivity, due_date: null })}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                              >
                                Clear Date
                              </Button>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              {currentEmployee && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Auto-assigned to:</span>
                    <span className="text-sm text-purple-700">{(currentEmployee as any).full_name}</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    This activity will be automatically assigned to your profile
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="pt-6 border-t border-gray-200 mt-6">
              <div className="flex justify-end space-x-3 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (!isCreating) {
                      setShowCreateDialog(false);
                      setNewActivity({
                        title: '',
                        description: '',
                        priority: 'medium',
                        due_date: null
                      });
                    }
                  }}
                  disabled={isCreating}
                  className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateActivity} 
                  disabled={!newActivity.title.trim() || isCreating || isLoadingEmployee || !currentEmployee}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : isLoadingEmployee ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading profile...
                    </div>
                  ) : !currentEmployee ? (
                    'Profile not found'
                  ) : (
                    'Create Activity'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Step Dialog */}
        <Dialog open={showAddStepDialog.isOpen} onOpenChange={(open) => setShowAddStepDialog({ isOpen: open, activityId: null, activityTitle: '' })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Step</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="step-title">Step Title</Label>
                <Input
                  id="step-title"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Enter step title..."
                />
              </div>
              <p className="text-sm text-gray-600">
                Adding step to: <span className="font-medium">{showAddStepDialog.activityTitle}</span>
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (!isAddingStep) {
                    setNewStep('');
                    setShowAddStepDialog({ isOpen: false, activityId: null, activityTitle: '' });
                  }
                }}
                disabled={isAddingStep}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddStep} 
                disabled={!newStep.trim() || isAddingStep}
                className="min-w-[100px]"
              >
                {isAddingStep ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </div>
                ) : (
                  'Add Step'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DragDropContext>
  );
};
