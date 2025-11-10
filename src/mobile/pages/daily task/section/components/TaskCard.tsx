import React from 'react';
import { CheckSquare, Square, Target, User, Calendar, Bell, AlertTriangle, Clock3, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/ui/tooltip';
import type { Task, TaskStep as TaskStepEntity } from '@/features/8-2-DailyTask/DailyTaskContext';
import { formatDate, isOverdue } from '../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  isHighlighted: boolean;
  visibleSteps: TaskStepEntity[];
  progress: number;
  blockerCount?: number;
  isTaskCreator: boolean;
  onToggleStatus: (task: Task) => void;
  onOpenModal: (taskId: string) => void;
  onToggleReminder: (task: Task) => void;
  onViewBlockers: (task: Task) => void;
  onRequestExtension: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  taskRef?: (el: HTMLDivElement | null) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isHighlighted,
  visibleSteps,
  progress,
  blockerCount = 0,
  isTaskCreator,
  onToggleStatus,
  onOpenModal,
  onToggleReminder,
  onViewBlockers,
  onRequestExtension,
  onEdit,
  onDelete,
  taskRef,
}) => {
  const isOverdueTask = isOverdue(task.due_date, task.status);
  const isCompleted = (task.has_substeps === false && task.status === 'completed') ||
                     (task.has_substeps !== false && progress === 100);

  return (
    <div
      ref={taskRef}
      className={`flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm transition-all duration-300 ${
        isHighlighted ? 'bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-blue-50'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStatus(task);
          }}
          className="mt-1 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          title={
            task.has_substeps === false
              ? task.status === 'completed'
                ? 'Mark incomplete'
                : 'Mark complete'
              : progress === 100
              ? 'Mark complete / reopen'
              : 'Complete all assigned steps to mark task complete'
          }
        >
          {(() => {
            if (task.has_substeps === false) {
              return task.status === 'completed' ? (
                <CheckSquare className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4" />
              );
            }
            return progress === 100 ? (
              <CheckSquare className="h-4 w-4 text-green-600" />
            ) : (
              <Square className="h-4 w-4" />
            );
          })()}
        </button>

        <div
          className="flex-1 min-w-0 space-y-2 cursor-pointer"
          onClick={() => onOpenModal(task.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`flex-1 min-w-0 truncate text-left text-[13px] font-semibold leading-5 transition-colors ${
                    isCompleted
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    {isHighlighted && (
                      <Target className="h-4 w-4 text-primary animate-pulse" />
                    )}
                    <span className="truncate">{task.title}</span>
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="start"
                className="max-w-md border border-slate-700 bg-slate-900 p-4 text-white shadow-lg"
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {task.title}
                </p>
                {task.description && (
                  <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-300">
                    {task.description}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {progress}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {visibleSteps.filter((s) => s.is_completed).length}/{visibleSteps.length}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-foreground">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  {task.assigned_to_name ? (
                    <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                      {task.assigned_to_name}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground">Unassigned</span>
                  )}
                </span>
              </TooltipTrigger>
              {task.assigned_to_name && (
                <TooltipContent>
                  <span>{task.assigned_to_name}</span>
                </TooltipContent>
              )}
            </Tooltip>
            {task.due_date && (
              <span
                className={`inline-flex items-center gap-1 ${
                  isOverdueTask ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(task.due_date)}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReminder(task);
                }}
                className={`h-6 w-6 p-0 ${
                  task.has_reminder ?? false
                    ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
                title={
                  task.has_reminder ?? false
                    ? 'Pengingat aktif'
                    : task.due_date
                    ? 'Aktifkan pengingat'
                    : 'Set due date terlebih dahulu untuk mengaktifkan pengingat'
                }
              >
                <Bell
                  className={`h-3.5 w-3.5 ${
                    task.has_reminder ?? false ? 'fill-current' : ''
                  }`}
                />
              </Button>

              {blockerCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewBlockers(task);
                  }}
                  className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                  title="View blockers"
                >
                  <AlertTriangle className="h-3 w-3" />
                </Button>
              )}

              {task.due_date && task.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestExtension(task);
                  }}
                  className="h-6 w-6 p-0 text-gray-400 hover:bg-orange-50 hover:text-orange-600"
                  title="Request deadline extension"
                >
                  <Clock3 className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  isTaskCreator && onEdit(task);
                }}
                disabled={!isTaskCreator}
                className={`h-6 w-6 p-0 ${
                  isTaskCreator
                    ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-600'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={isTaskCreator ? 'Edit task' : '🔒 Only task creator can edit'}
              >
                <Edit className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isTaskCreator) {
                    onDelete(task);
                  }
                }}
                disabled={!isTaskCreator}
                className={`h-6 w-6 p-0 ${
                  isTaskCreator
                    ? 'cursor-pointer hover:bg-red-50 hover:text-red-600'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={isTaskCreator ? 'Delete task' : '🔒 Only task creator can delete'}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

