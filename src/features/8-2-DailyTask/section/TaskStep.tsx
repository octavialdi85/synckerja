import React, { useState } from 'react';
import { CheckSquare, Square, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { useDailyTask } from '../DailyTaskContext';
import { Draggable } from 'react-beautiful-dnd';

interface TaskStepProps {
  step: {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
    order: number;
    created_at: string;
  };
  index: number;
}

export const TaskStep = ({ step, index }: TaskStepProps) => {
  const { updateTaskStep, deleteTaskStep } = useDailyTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);

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

  return (
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
  );
};





