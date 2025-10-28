import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, Edit, Trash2, GripVertical, Paperclip, Upload, FileText, X, Users, Link, History } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { useDailyTask } from '../DailyTaskContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssignStepDialog } from './AssignStepDialog';
import { StepLinks } from './StepLinks';
import { StepHistoryModal } from './StepHistoryModal';

interface TaskFile {
  id: string;
  task_steps_id: string;
  filename: string;
  file_url: string;
  file_size: number;
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
    assigned_to?: string | null;
    assigned_at?: string | null;
    assigned_by?: string | null;
    status?: string;
    priority?: string;
    files?: TaskFile[];
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
}

export const TaskStep = ({ step, index }: TaskStepProps) => {
  const { updateTaskStep, deleteTaskStep, uploadTaskStepFile, deleteTaskFile, assignTaskStep } = useDailyTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [showFiles, setShowFiles] = useState(step.files && step.files.length > 0);
  const [showLinks, setShowLinks] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Update showFiles when step.files changes
  useEffect(() => {
    if (step.files && step.files.length > 0) {
      setShowFiles(true);
    }
  }, [step.files]);

  const handleToggleComplete = async () => {
    await updateTaskStep(step.id, { is_completed: !step.is_completed });
  };

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

  const handleAssignStep = async (employeeId: string) => {
    try {
      await assignTaskStep(step.id, employeeId);
      setShowAssignDialog(false);
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

  return (
    <div className="space-y-2">
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 bg-white rounded-md hover:bg-blue-50 transition-colors border border-blue-100 ${
          isDragging ? 'shadow-lg bg-blue-100' : ''
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
        {...attributes}
        {...listeners}
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
              onClick={() => setShowLinks(!showLinks)}
              className={`h-6 w-6 p-0 hover:text-gray-600 ${
                showLinks ? 'text-blue-500' : 'text-gray-400'
              }`}
              title="Toggle links"
            >
              <Link className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssignDialog(true)}
              className={`h-6 w-6 p-0 hover:text-gray-600 ${
                step.assigned_to ? 'text-green-500' : 'text-gray-400'
              }`}
              title={step.assigned_to ? `Assigned to ${step.assigned_employee?.full_name || 'Unknown'}` : 'Assign step'}
            >
              <Users className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-purple-600"
              title="View history and manage blockers"
            >
              <History className="w-3 h-3" />
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
        onHistoryUpdate={() => {
          // Refresh step data if needed
        }}
      />
    )}
    </div>
  );
};





