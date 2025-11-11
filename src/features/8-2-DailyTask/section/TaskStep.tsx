import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, Edit, Trash2, GripVertical, Paperclip, Upload, FileText, X, Users, Link, History, Plus, ListChecks, FileEdit } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import { useDailyTask } from '../DailyTaskContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssignStepDialog } from './AssignStepDialog';
import { StepLinks } from './StepLinks';
import { StepHistoryModal } from './StepHistoryModal';
import { ModalViewSubSteps } from './ModalViewSubSteps';
import UpdateHistoryDialog from '@/features/8-1-meeting-notes/modal/UpdateHistoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';

interface TaskFile {
  id: string;
  task_steps_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

interface TaskLink {
  id: string;
  task_steps_id: string;
  title: string;
  url: string;
  created_at: string;
}

interface TaskStepProps {
  step: {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
    order: number;
    created_at: string;
    updated_at?: string;
    created_by?: string | null;
    assigned_to?: string | null;
    assigned_at?: string | null;
    assigned_by?: string | null;
    status?: string;
    priority?: string;
    files?: TaskFile[];
    links?: TaskLink[];
    assigned_due_date?: string | null;
    has_assigned_substeps?: boolean; // True if this step has sub-steps assigned to current user
    // Relations
    assigned_employee?: {
      id: string;
      full_name: string;
      email?: string;
    };
    assigned_by_employee?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  index: number;
  taskCreatedBy?: string; // Task creator user ID for permission check
  autoReorder?: boolean; // Enable auto-reorder when step completion changes (for mobile)
}

export const TaskStep = ({ step, index, taskCreatedBy, autoReorder = false }: TaskStepProps) => {
  const { updateTaskStep, deleteTaskStep, uploadTaskStepFile, deleteTaskFile, assignTaskStep } = useDailyTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [showFiles, setShowFiles] = useState(false); // Default collapsed
  const [showLinks, setShowLinks] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isViewSubStepsOpen, setIsViewSubStepsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subStepCount, setSubStepCount] = useState<number>(0);
  const [subStepCompletedCount, setSubStepCompletedCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [linkCount, setLinkCount] = useState<number>(0);
  // Optimistic update state for immediate UI feedback
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [optimisticUpdatedAt, setOptimisticUpdatedAt] = useState<string | null>(null);
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();

  // States for meeting point integration
  const [isFromMeetingPoint, setIsFromMeetingPoint] = useState(false);
  const [solutionId, setSolutionId] = useState<string | null>(null);
  const [meetingPointId, setMeetingPointId] = useState<string | null>(null);
  const [discussionPoint, setDiscussionPoint] = useState<string>('');
  const [isUpdateHistoryOpen, setIsUpdateHistoryOpen] = useState(false);
  const [isCheckingMeetingPoint, setIsCheckingMeetingPoint] = useState(false);
  const [updateHistoryCount, setUpdateHistoryCount] = useState<number>(0);

  // Use optimistic state if available, otherwise use step prop (for immediate UI feedback)
  const isCompleted = optimisticCompleted !== null ? optimisticCompleted : step.is_completed;
  const updatedAt = optimisticUpdatedAt !== null ? optimisticUpdatedAt : step.updated_at;

  // Check if current user is the creator of the task
  const isTaskCreator = taskCreatedBy === user?.id;

  // Check if current user is the creator of this step
  const isStepCreator = step.created_by === user?.id;

  // Check if current user is assigned to this step
  const isAssignedToMe = step.assigned_to === user?.id;

  // Permission: Creator can do everything, assigned user can only complete
  const canEdit = isTaskCreator;
  const canDelete = isTaskCreator;
  const canAssign = isTaskCreator;

  // Check if step has notifications (files)
  const fileCount = step.files?.length || 0;

  // Use sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `step-${step.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Removed auto-expand effect - files section now defaults to collapsed

  // Compute on-time/late label for finished step vs due date
  const getFinishStatusLabel = (): { text: string; className: string } | null => {
    if (!step.assigned_due_date || !updatedAt || !isCompleted) return null;
    const assigneeName = step.assigned_employee?.full_name || 'Assignee';
    const finish = new Date(updatedAt);
    const dueEnd = new Date(step.assigned_due_date);
    // on time means finish is on/before 23:59:59 of due date
    dueEnd.setHours(23, 59, 59, 999);
    if (finish.getTime() <= dueEnd.getTime()) {
      return { text: `${assigneeName} · ontime`, className: 'inline-flex items-center whitespace-normal break-words bg-green-100 text-green-700 border border-green-200 rounded px-1.5 py-0.5' };
    }
    const diffMs = finish.getTime() - dueEnd.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const lateDays = Math.ceil(diffMs / dayMs);
    return { text: `${assigneeName} · late ${lateDays} day${lateDays > 1 ? 's' : ''}` , className: 'inline-flex items-center whitespace-normal break-words bg-red-100 text-red-700 border border-red-200 rounded px-1.5 py-0.5' };
  };

  // Load history count and link count for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch history count using RPC
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Count timeout')), 3000)
        );

        const countPromise = (supabase as any).rpc('get_step_history_count', {
          p_task_step_id: step.id
        });

        const { data: count, error } = await Promise.race([
          countPromise,
          timeoutPromise
        ]) as any;
        
        if (!error) {
          setHistoryCount(count || 0);
        } else {
          setHistoryCount(0);
        }
        
        // Fetch link count from task_step_links table
        const { count: linksCount, error: linksError } = await supabase
          .from('task_step_links')
          .select('*', { count: 'exact', head: true })
          .eq('task_step_id', step.id);
        
        if (!linksError) {
          setLinkCount(linksCount || 0);
        }
      } catch (error: any) {
        // Graceful degradation for timeout or other errors
        setHistoryCount(0);
      }
    };

    fetchCounts();
  }, [step.id]);

  // Load sub-steps stats (total and completed)
  useEffect(() => {
    const fetchSubStepStats = async () => {
      if (!organizationId) return;
      try {
        const [{ count: totalCount }, { count: completedCount }] = await Promise.all([
          supabase
            .from('task_steps_to_steps')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('parent_step_id', step.id),
          supabase
            .from('task_steps_to_steps')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('parent_step_id', step.id)
            .eq('is_completed', true),
        ]);
        setSubStepCount(totalCount || 0);
        setSubStepCompletedCount(completedCount || 0);
      } catch (err) {
        // ignore
      }
    };
    fetchSubStepStats();
  }, [organizationId, step.id]);

  // Refresh stats when closing sub-steps modal
  useEffect(() => {
    if (!isViewSubStepsOpen) {
      (async () => {
        if (!organizationId) return;
        try {
          const [{ count: totalCount }, { count: completedCount }] = await Promise.all([
            supabase
              .from('task_steps_to_steps')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('parent_step_id', step.id),
            supabase
              .from('task_steps_to_steps')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('parent_step_id', step.id)
              .eq('is_completed', true),
          ]);
          setSubStepCount(totalCount || 0);
          setSubStepCompletedCount(completedCount || 0);
        } catch (_) {
          // ignore
        }
      })();
    }
  }, [isViewSubStepsOpen, organizationId, step.id]);

  // Check if step is from meeting point
  useEffect(() => {
    const checkIfFromMeetingPoint = async () => {
      if (!organizationId || !step.title) {
        setIsFromMeetingPoint(false);
        return;
      }

      setIsCheckingMeetingPoint(true);
      try {
        // First, query solution with solution_description that matches step.title
        const { data: solution, error: solutionError } = await supabase
          .from('meeting_point_solutions')
          .select('id, meeting_point_id, solution_description')
          .eq('solution_description', step.title)
          .maybeSingle();

        if (solutionError) {
          console.error('Error checking meeting point solution:', solutionError);
          setIsFromMeetingPoint(false);
          return;
        }

        if (!solution || !solution.meeting_point_id) {
          setIsFromMeetingPoint(false);
          return;
        }

        // Found solution - now verify it belongs to current organization
        const { data: meetingPoint, error: meetingPointError } = await supabase
          .from('meeting_points')
          .select('id, discussion_point, organization_id')
          .eq('id', solution.meeting_point_id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (meetingPointError) {
          console.error('Error checking meeting point:', meetingPointError);
          setIsFromMeetingPoint(false);
          return;
        }

        if (meetingPoint && meetingPoint.organization_id === organizationId) {
          // Step is from meeting point - set all required data
          console.log('✅ Step is from meeting point:', {
            stepTitle: step.title,
            solutionId: solution.id,
            meetingPointId: solution.meeting_point_id,
            discussionPoint: meetingPoint.discussion_point
          });
          setIsFromMeetingPoint(true);
          setSolutionId(solution.id);
          setMeetingPointId(solution.meeting_point_id);
          setDiscussionPoint(meetingPoint.discussion_point || '');
        } else {
          setIsFromMeetingPoint(false);
        }
      } catch (error) {
        console.error('Error checking meeting point:', error);
        setIsFromMeetingPoint(false);
      } finally {
        setIsCheckingMeetingPoint(false);
      }
    };

    checkIfFromMeetingPoint();
  }, [step.title, organizationId]);

  // Fetch update history count for solution
  useEffect(() => {
    const fetchUpdateCount = async () => {
      if (!solutionId || !isFromMeetingPoint) {
        setUpdateHistoryCount(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('meeting_point_updates')
          .select('*', { count: 'exact', head: true })
          .eq('meeting_point_solution_id', solutionId);

        if (error) {
          console.error('Error fetching update count:', error);
          setUpdateHistoryCount(0);
          return;
        }

        setUpdateHistoryCount(count || 0);
      } catch (error) {
        console.error('Error fetching update count:', error);
        setUpdateHistoryCount(0);
      }
    };

    fetchUpdateCount();
  }, [solutionId, isFromMeetingPoint]);

  // Refresh update count when dialog closes (in case updates were added/removed)
  useEffect(() => {
    if (!isUpdateHistoryOpen && solutionId && isFromMeetingPoint) {
      const fetchUpdateCount = async () => {
        try {
          const { count, error } = await supabase
            .from('meeting_point_updates')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_point_solution_id', solutionId);

          if (!error) {
            setUpdateHistoryCount(count || 0);
          }
        } catch (error) {
          console.error('Error refreshing update count:', error);
        }
      };

      fetchUpdateCount();
    }
  }, [isUpdateHistoryOpen, solutionId, isFromMeetingPoint]);

  const handleToggleComplete = async () => {
    // Jika step memiliki sub-step, tidak bisa di-toggle langsung
    if (subStepCount > 0) {
      // Jika step belum completed, cek apakah semua sub-step sudah selesai
      if (!step.is_completed) {
        const allSubStepsCompleted = subStepCompletedCount === subStepCount && subStepCount > 0;
        if (!allSubStepsCompleted) {
          // Tampilkan pesan bahwa semua sub-step harus diselesaikan terlebih dahulu
          alert(`Please complete all ${subStepCount} sub-step(s) first. Currently ${subStepCompletedCount}/${subStepCount} completed.`);
          return;
        }
      } else {
        // Jika step sudah completed dan memiliki sub-step, tidak bisa di-uncheck
        alert(`Cannot uncheck step with sub-steps. Please manage sub-steps individually.`);
        return;
      }
    }

    const next = !step.is_completed;
    const payload: any = { is_completed: next };
    const now = new Date().toISOString();
    if (next) {
      payload.updated_at = now;
    }

    // Jika step tidak punya sub-step, langsung update UI (optimistic update) tanpa menunggu
    if (subStepCount === 0) {
      // Update UI immediately
      setOptimisticCompleted(next);
      if (next) {
        setOptimisticUpdatedAt(now);
      } else {
        setOptimisticUpdatedAt(null);
      }

      // Update ke Supabase di background tanpa menunggu
      updateTaskStep(step.id, payload, { autoReorder }).catch((error) => {
        console.error('Error updating task step:', error);
        // Revert optimistic update on error
        setOptimisticCompleted(null);
        setOptimisticUpdatedAt(null);
      });
    } else {
      // Jika ada sub-step, tunggu validasi terlebih dahulu
      await updateTaskStep(step.id, payload, { autoReorder });
    }
  };

  // Reset optimistic state when step prop changes (after update completes)
  useEffect(() => {
    if (optimisticCompleted !== null && step.is_completed === optimisticCompleted) {
      setOptimisticCompleted(null);
      setOptimisticUpdatedAt(null);
    }
  }, [step.is_completed, step.updated_at, optimisticCompleted]);

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== step.title) {
      await updateTaskStep(step.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(step.title);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      await deleteTaskStep(step.id);
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
      await uploadTaskStepFile(step.id, file);
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
      await deleteTaskFile(fileId);
    }
  };

  const handleAssignStep = async (employeeId: string, dueDateIso?: string | null) => {
    try {
      await assignTaskStep(step.id, employeeId, dueDateIso || null);
    } catch (error) {
      console.error('Error assigning step:', error);
    }
  };

  const handleUnassignStep = async () => {
    if (window.confirm('Are you sure you want to unassign this step?')) {
      try {
        await assignTaskStep(step.id, null);
      } catch (error) {
        console.error('Error unassigning step:', error);
      }
    }
  };

  const renderActionButtons = () => (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsViewSubStepsOpen(true)}
        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 relative"
        title="View steps"
      >
        <ListChecks className="w-3 h-3" />
        {subStepCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {subStepCount}
          </div>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFiles(!showFiles)}
        className={`h-6 w-6 p-0 hover:text-gray-600 relative ${
          step.files && step.files.length > 0 
            ? 'text-blue-500' 
            : 'text-gray-400'
        }`}
        title={`Toggle files ${step.files && step.files.length > 0 ? `(${step.files.length})` : ''}`}
      >
        <Paperclip className="w-3 h-3" />
        {fileCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {fileCount}
          </div>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowLinks(!showLinks)}
        className={`h-6 w-6 p-0 hover:text-gray-600 relative ${
          linkCount > 0 ? 'text-green-500' : 'text-gray-400'
        }`}
        title="Toggle links"
      >
        <Link className="w-3 h-3" />
        {linkCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {linkCount}
          </div>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => canAssign && setShowAssignDialog(true)}
        disabled={!canAssign}
        className={`h-6 w-6 p-0 relative ${
          canAssign
            ? `hover:text-gray-600 ${step.assigned_to ? 'text-green-500' : 'text-gray-400'}`
            : 'opacity-40 cursor-not-allowed text-gray-400'
        }`}
        title={
          canAssign
            ? (step.assigned_to ? `Assigned to ${step.assigned_employee?.full_name || 'Unknown'}` : 'Assign step')
            : '🔒 Only task creator can assign steps'
        }
      >
        <Users className="w-3 h-3" />
        {step.assigned_to && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            1
          </div>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHistoryModal(true)}
        className={`h-6 w-6 p-0 hover:text-purple-600 relative ${
          historyCount > 0 ? 'text-purple-500' : 'text-gray-400'
        }`}
        title={`View history and manage blockers ${historyCount > 0 ? `(${historyCount})` : ''}`}
      >
        <History className="w-3 h-3" />
        {historyCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {historyCount}
          </div>
        )}
      </Button>
      {isFromMeetingPoint && solutionId && meetingPointId && discussionPoint && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsUpdateHistoryOpen(true)}
          className={`h-6 w-6 p-0 relative ${
            updateHistoryCount > 0 ? 'text-blue-600 hover:text-blue-700' : 'text-blue-500 hover:text-blue-600'
          }`}
          title={`Update History from Meeting Notes ${updateHistoryCount > 0 ? `(${updateHistoryCount})` : ''}`}
        >
          <FileEdit className="w-3 h-3" />
          {updateHistoryCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {updateHistoryCount > 99 ? '99+' : updateHistoryCount}
            </div>
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => canEdit && setIsEditing(true)}
        disabled={!canEdit}
        className={`h-6 w-6 p-0 ${
          canEdit 
            ? 'text-gray-400 hover:text-gray-600 cursor-pointer' 
            : 'text-gray-300 opacity-40 cursor-not-allowed'
        }`}
        title={canEdit ? 'Edit step' : '🔒 Only task creator can edit steps'}
      >
        <Edit className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => canDelete && handleDelete()}
        disabled={!canDelete}
        className={`h-6 w-6 p-0 ${
          canDelete 
            ? 'text-gray-400 hover:text-red-600 cursor-pointer' 
            : 'text-gray-300 opacity-40 cursor-not-allowed'
        }`}
        title={canDelete ? 'Delete step' : '🔒 Only task creator can delete steps'}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </>
  );

  return (
    <div className="space-y-2">
      <div
        ref={setNodeRef}
        style={style}
        data-step-id={step.id}
        className={`flex items-start md:items-center gap-2 p-2 bg-white rounded-md hover:bg-blue-50 transition-colors border border-blue-100 ${
          isDragging ? 'shadow-lg bg-blue-100' : ''
        }`}
      >
      <div className="flex items-start gap-2 flex-shrink-0 pt-0.5">
        <button
          onClick={handleToggleComplete}
          disabled={
            (subStepCount > 0 && subStepCompletedCount < subStepCount && !isCompleted) ||
            (subStepCount > 0 && isCompleted)
          }
          className={`transition-colors ${
            (subStepCount > 0 && subStepCompletedCount < subStepCount && !isCompleted) ||
            (subStepCount > 0 && isCompleted)
              ? 'text-gray-300 cursor-not-allowed opacity-50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={
            subStepCount > 0 && subStepCompletedCount < subStepCount && !isCompleted
              ? `Please complete all ${subStepCount} sub-step(s) first. Currently ${subStepCompletedCount}/${subStepCount} completed.`
              : subStepCount > 0 && isCompleted
              ? 'Cannot uncheck step with sub-steps. Please manage sub-steps individually.'
              : isCompleted
              ? 'Mark incomplete'
              : 'Mark complete'
          }
        >
          {isCompleted ? (
            <CheckSquare className="w-4 h-4 text-green-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-0.5"
        >
          <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
        </div>
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
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className={`text-sm line-clamp-2 md:truncate min-w-0 ${
                isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
              }`}>
                {step.title}
              </span>
              {/* Badge to indicate assignment status */}
              <div className="flex items-center gap-2 flex-wrap">
                {isAssignedToMe && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                    Assigned to you
                  </Badge>
                )}
                {!isAssignedToMe && step.assigned_to && isStepCreator && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300">
                    Assigned to {step.assigned_employee?.full_name || 'other'}
                  </Badge>
                )}
                {!isAssignedToMe && !step.assigned_to && step.has_assigned_substeps && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-300">
                    Sub-step assigned to you
                  </Badge>
                )}
              </div>
            </div>
            {/* Finished timestamp below title - Desktop only */}
            {isCompleted && updatedAt && (
              <div className="hidden md:flex -mt-0.5 md:mt-1 items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-500">Finished: {new Date(updatedAt).toLocaleString()}</span>
                {getFinishStatusLabel() && (
                  <span className={getFinishStatusLabel()!.className}>{getFinishStatusLabel()!.text}</span>
                )}
              </div>
            )}
            {/* Icons below title on mobile, to the right on desktop when no sub-steps */}
            {subStepCount === 0 && (
              <div className="mt-1 flex justify-end md:hidden">
                <div className="inline-flex items-center gap-1 p-1.5 bg-slate-100 border border-slate-300 rounded-lg shadow-sm">
                  {renderActionButtons()}
                </div>
              </div>
            )}
            {subStepCount > 0 && (
              <div className="mt-1">
                <div className="w-full h-1.5 bg-blue-100 rounded">
                  <div
                    className="h-1.5 bg-blue-500 rounded"
                    style={{ width: `${Math.min(100, Math.round((subStepCompletedCount / subStepCount) * 100))}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Finished timestamp for mobile - only show when completed */}
                    {isCompleted && updatedAt && (
                      <span className="md:hidden text-gray-500">Finished: {new Date(updatedAt).toLocaleString()}</span>
                    )}
                    {step.assigned_due_date && (
                      <span>Due: {new Date(step.assigned_due_date).toLocaleDateString()}</span>
                    )}
                    {getFinishStatusLabel() && (
                      <span className={`ml-0 ${getFinishStatusLabel()!.className}`}>{getFinishStatusLabel()!.text}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{subStepCompletedCount}/{subStepCount}</span>
                    <span className="font-medium">
                      {Math.round((subStepCompletedCount / subStepCount) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <div className="inline-flex items-center gap-1 p-1.5 bg-slate-100 border border-slate-300 rounded-lg shadow-sm">
                    {renderActionButtons()}
                  </div>
                </div>
              </div>
            )}
            {subStepCount === 0 && step.assigned_due_date && (
              <div className="mt-1 flex items-center gap-4 text-[10px] text-gray-500">
                <span>Due: {new Date(step.assigned_due_date).toLocaleDateString()}</span>
                {getFinishStatusLabel() && (
                  <span className={getFinishStatusLabel()!.className}>{getFinishStatusLabel()!.text}</span>
                )}
              </div>
            )}
          </div>

          {/* Icons to the right on desktop when no sub-steps */}
          {subStepCount === 0 && (
            <div className="hidden md:flex items-center justify-end gap-1 flex-shrink-0">
              <div className="inline-flex items-center gap-1 p-1.5 bg-slate-100 border border-slate-300 rounded-lg shadow-sm">
                {renderActionButtons()}
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* File Upload and Display Section - Moved outside main container */}
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
                    onClick={() => window.open(file.file_url, '_blank')}
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

    {/* Links Section */}
    {showLinks && (
      <StepLinks
        taskStepId={step.id}
        isExpanded={showLinks}
        onLinksChange={async () => {
          // Refresh link count when links change
          try {
            const { count: linksCount } = await supabase
              .from('task_step_links')
              .select('*', { count: 'exact', head: true })
              .eq('task_step_id', step.id);
            setLinkCount(linksCount || 0);
          } catch (error) {
            console.error('Error refreshing link count:', error);
          }
        }}
      />
    )}

    {/* Assignment Dialog */}
    {showAssignDialog && (
      <AssignStepDialog
        step={step}
        onAssign={handleAssignStep}
        onUnassign={handleUnassignStep}
        onClose={() => setShowAssignDialog(false)}
      />
    )}

    {/* History Modal */}
    {showHistoryModal && (
      <StepHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        taskStepId={step.id}
        stepTitle={step.title}
        currentStatus={step.status || 'pending'}
        currentPriority={step.priority || 'medium'}
        taskId={step.task_id}
        onHistoryUpdate={async () => {
          // Refresh history count after adding entry using RPC
          try {
            const { data: count, error } = await (supabase as any).rpc('get_step_history_count', {
              p_task_step_id: step.id
            });
            
            if (error) {
              console.error('Error refreshing history count:', error);
            } else {
              setHistoryCount(count || 0);
            }
          } catch (error) {
            console.error('Error refreshing history count:', error);
          }
        }}
      />
    )}
    <ModalViewSubSteps
      open={isViewSubStepsOpen}
      onOpenChange={setIsViewSubStepsOpen}
      parentStepId={step.id}
      parentStepTitle={step.title}
      taskCreatedBy={taskCreatedBy}
      onParentCompletionChange={async (completed) => {
        try {
          const payload: any = { is_completed: completed };
          if (completed) {
            payload.updated_at = new Date().toISOString();
          }
          await updateTaskStep(step.id, payload, { autoReorder });
        } catch (_) {
          // ignore
        }
      }}
    />

    {/* Update History Dialog from Meeting Point */}
    {isFromMeetingPoint && solutionId && meetingPointId && discussionPoint && (
      <UpdateHistoryDialog
        isOpen={isUpdateHistoryOpen}
        onClose={() => setIsUpdateHistoryOpen(false)}
        meetingPointId={meetingPointId}
        solutionId={solutionId}
        discussionPoint={discussionPoint}
      />
    )}
    </div>
  );
};





