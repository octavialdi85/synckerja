import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, Edit, Trash2, GripVertical, Paperclip, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { useDailyTask } from '../DailyTaskContext';
import { Draggable } from 'react-beautiful-dnd';

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
    files?: TaskFile[];
  };
  index: number;
}

export const TaskStep = ({ step, index }: TaskStepProps) => {
  const { updateTaskStep, deleteTaskStep, uploadTaskStepFile, deleteTaskFile } = useDailyTask();
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
    </div>
  );
};





