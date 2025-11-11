import React from 'react';
import { ArrowLeft, CheckSquare, Paperclip, User, Flag, Bell, AlertTriangle, History, Clock3, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Dialog, DialogContent } from '@/features/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskStep as TaskStepItem } from '@/features/8-2-DailyTask/section/TaskStep';
import type { Task, TaskStep as TaskStepEntity } from '@/features/8-2-DailyTask/DailyTaskContext';
import { formatDate, formatDaysRemaining, getStatusLabel, getPriorityLabel, isTaskCreator } from '../utils/taskUtils';

interface TaskDetailModalProps {
  task: Task;
  visibleSteps: TaskStepEntity[];
  progress: number;
  isOverdue: boolean;
  daysRemaining: number | null;
  blockerCount: number;
  userId: string | undefined;
  onClose: () => void;
  onToggleReminder: (task: Task) => void;
  onViewBlockers: (task: Task) => void;
  onViewHistory: (taskId: string) => void;
  onRequestExtension: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (task: Task) => void;
  onPriorityChange: (taskId: string, priority: Task['priority']) => void;
  onAddStep: (taskId: string, taskTitle: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  visibleSteps,
  progress,
  isOverdue,
  daysRemaining,
  blockerCount,
  userId,
  onClose,
  onToggleReminder,
  onViewBlockers,
  onViewHistory,
  onRequestExtension,
  onEdit,
  onDelete,
  onPriorityChange,
  onAddStep,
}) => {
  const userIsCreator = isTaskCreator(task, userId);
  const completedStepsCount = visibleSteps.filter((s) => s.is_completed).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="max-w-none w-screen h-screen border-none bg-card p-0 shadow-xl focus:outline-none flex flex-col m-0 rounded-none translate-x-0 translate-y-0 left-0 top-0"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close task details"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground break-words max-w-full">{task.title}</span>
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
          {task.description && (
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Description
              </span>
              <p className="rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground break-words max-w-full whitespace-pre-wrap overflow-hidden">
                {task.description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Progress</span>
              <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5" />
                {completedStepsCount}/{visibleSteps.length}
              </span>
              {task.files.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  {task.files.length} files
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  PIC
                </span>
                <span className="inline-flex items-center gap-1 text-foreground min-w-0 max-w-full">
                  <User className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  {task.assigned_to_name ? (
                    <span className="break-words min-w-0">{task.assigned_to_name}</span>
                  ) : (
                    <span className="italic text-muted-foreground">Unassigned</span>
                  )}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left w-full">
                  Priority
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={!userIsCreator}
                      className={`h-auto w-full justify-start gap-0 rounded-md p-0 text-left ${
                        userIsCreator
                          ? 'hover:bg-transparent text-foreground'
                          : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-muted-foreground text-left block">
                        {getPriorityLabel(task.priority)}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  {userIsCreator && (
                    <DropdownMenuContent align="start" className="w-32">
                      <DropdownMenuItem
                        onClick={() => onPriorityChange(task.id, 'low')}
                        className="flex items-center gap-2"
                      >
                        <Flag className="w-3 h-3 text-green-600" />
                        <span className="text-green-700">Low</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPriorityChange(task.id, 'medium')}
                        className="flex items-center gap-2"
                      >
                        <Flag className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700">Medium</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPriorityChange(task.id, 'high')}
                        className="flex items-center gap-2"
                      >
                        <Flag className="w-3 h-3 text-orange-600" />
                        <span className="text-orange-700">High</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPriorityChange(task.id, 'urgent')}
                        className="flex items-center gap-2"
                      >
                        <Flag className="w-3 h-3 text-red-600" />
                        <span className="text-red-700">Urgent</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Due Date
                </span>
                {task.due_date ? (
                  <div className="text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{formatDate(task.due_date)}</span>
                      <span className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formatDaysRemaining(daysRemaining)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="italic text-muted-foreground">No due date</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </span>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {getStatusLabel(task.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleReminder(task)}
              className={`h-7 w-7 p-0 ${
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
              <Bell className={`w-3 h-3 ${task.has_reminder ?? false ? 'fill-current' : ''}`} />
            </Button>

            {blockerCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewBlockers(task)}
                className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                title="View blockers"
              >
                <AlertTriangle className="w-3 h-3" />
              </Button>
            )}

            {task.deadline_history && task.deadline_history.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewHistory(task.id)}
                className="h-7 w-7 p-0 hover:bg-gray-50 hover:text-gray-600"
                title="View deadline history"
              >
                <History className="w-3 h-3" />
              </Button>
            )}

            {task.status !== 'completed' && task.due_date && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRequestExtension(task.id)}
                className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600"
                title="Request deadline extension"
              >
                <Clock3 className="w-3 h-3" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => userIsCreator && onEdit(task.id)}
              disabled={!userIsCreator}
              className={`h-7 w-7 p-0 ${
                userIsCreator
                  ? 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              title={userIsCreator ? 'Edit task' : '🔒 Only task creator can edit'}
            >
              <Edit className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (userIsCreator) {
                  onDelete(task);
                }
              }}
              disabled={!userIsCreator}
              className={`h-7 w-7 p-0 ${
                userIsCreator
                  ? 'hover:bg-red-50 hover:text-red-600 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              title={userIsCreator ? 'Delete task' : '🔒 Only task creator can delete'}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Steps ({completedStepsCount}/{visibleSteps.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (userIsCreator) {
                    onAddStep(task.id, task.title);
                  }
                }}
                disabled={!userIsCreator}
                className={`${
                  userIsCreator
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>

            <SortableContext
              items={(task.steps ?? []).map((step) => `step-${step.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {visibleSteps.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                    No steps yet
                  </div>
                ) : (
                  visibleSteps
                    .sort((a, b) => a.order - b.order)
                    .map((step, index) => (
                      <TaskStepItem
                        key={step.id}
                        step={step as any}
                        index={index}
                        taskCreatedBy={task.created_by}
                        autoReorder={true}
                      />
                    ))
                )}
              </div>
            </SortableContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

