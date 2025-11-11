import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { TooltipProvider } from '@/features/ui/tooltip';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { useDailyTask, type Task } from '@/features/8-2-DailyTask/DailyTaskContext';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useToast } from '@/features/ui/use-toast';
import { DeadlineExtensionDialog } from '@/features/8-2-DailyTask/section/DeadlineExtensionDialog';
import { DeadlineHistoryDialog } from '@/features/8-2-DailyTask/section/DeadlineHistoryDialog';
import { EditTaskDialog } from '@/features/8-2-DailyTask/section/EditTaskDialog';
import { CreateTaskDialog } from '@/features/8-2-DailyTask/section/CreateTaskDialog';
import { ModalAddTaskStep } from '@/features/8-2-DailyTask/section/ModalAddTaskStep';
import { BlockerDetailsModal } from '@/features/8-2-DailyTaskReport/components/BlockerDetailsModal';
import '@/features/8-2-DailyTask/section/TaskList.css';

// Hooks
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTaskModal } from './hooks/useTaskModal';
import { useAutoScroll } from './hooks/useAutoScroll';
import { useBlockerCounts } from './hooks/useBlockerCounts';
import { useTaskBlockers } from './hooks/useTaskBlockers';

// Components
import { TaskCard } from './components/TaskCard';
import { EmptyState } from './components/EmptyState';
import { DeleteTaskDialog } from './components/DeleteTaskDialog';
import { TaskDetailModal } from './components/TaskDetailModal';

// Utils
import {
  calculateProgress,
  isOverdue,
  getDaysRemaining,
  isTaskCreator as checkIsTaskCreator,
} from './utils/taskUtils';

export const TaskList = () => {
  const context = useDailyTask();
  const { tasks, filters, updateTask, deleteTask, reorderTaskSteps, highlightedTask } = context;
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployee();
  const { toast } = useToast();

  const currentUserId = user?.id ?? undefined;
  const currentEmployeeId =
    currentEmployee && typeof (currentEmployee as any).id === 'string'
      ? ((currentEmployee as any).id as string)
      : undefined;

  // Custom hooks
  const { filteredTasks, getVisibleSteps, isMyTask } = useTaskFilters({
    tasks,
    filters,
    currentUserId,
    currentEmployeeId,
  });

  const calculateAssignedStepsProgress = useCallback(
    (task: Task): number => {
      // Jika task tidak punya step dan sudah completed, progress = 100%
      if (task.has_substeps === false && task.status === 'completed') {
        return 100;
      }
      // Jika task tidak punya step dan belum completed, progress = 0%
      if (task.has_substeps === false && task.status !== 'completed') {
        return 0;
      }
      // Jika task punya step, hitung berdasarkan step yang completed
      const visibleSteps = getVisibleSteps(task);
      return calculateProgress(visibleSteps);
    },
    [getVisibleSteps, calculateProgress]
  );

  const { activeTask, activeVisibleSteps, activeProgress, openTaskModal, closeTaskModal } =
    useTaskModal({
      tasks,
      getVisibleSteps,
      calculateProgress: calculateAssignedStepsProgress,
    });

  const { taskRefs } = useAutoScroll({ highlightedTaskId: highlightedTask });
  const { blockerCountByTask } = useBlockerCounts({ filteredTasks });
  const { blockerModalOpen, blockerModalItems, setBlockerModalOpen, openTaskBlockers } =
    useTaskBlockers({
      getVisibleSteps,
    });

  // State management
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [reminderPendingTaskId, setReminderPendingTaskId] = useState<string | null>(null);
  const [deadlineDialog, setDeadlineDialog] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });
  const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });
  const [addStepDialog, setAddStepDialog] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({ isOpen: false, taskId: null, taskTitle: '' });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({ isOpen: false, taskId: null, taskTitle: '' });
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);

  // Computed values for active task
  const activeIsOverdue = activeTask ? isOverdue(activeTask.due_date, activeTask.status) : false;
  const activeDaysRemaining = activeTask
    ? getDaysRemaining(activeTask.due_date, activeTask.status)
    : null;
  const activeBlockerCount = activeTask ? blockerCountByTask[activeTask.id] || 0 : 0;

  // Handlers
  const isTaskCreator = useCallback(
    (task: Task) => checkIsTaskCreator(task, currentUserId),
    [currentUserId]
  );

  const handleStatusToggle = useCallback(
    (task: Task) => {
      // If task has no steps (has_substeps = FALSE), allow direct toggle with optimistic update
      if (task.has_substeps === false) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        if (newStatus !== task.status) {
          toast({
            title: newStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
            description: `"${task.title}" has been ${newStatus === 'completed' ? 'marked as completed' : 'reopened'}`,
          });
          // Optimistic update: langsung update tanpa menunggu (updateTask sudah melakukan optimistic update di context)
          updateTask(task.id, { status: newStatus }).catch((err) => {
            console.error('Error updating task status:', err);
            toast({
              title: 'Error',
              description: 'Failed to update task status',
              variant: 'destructive',
            });
          });
        }
        return;
      }

      // If task has steps, tidak bisa di-toggle langsung
      const assignedProgress = calculateAssignedStepsProgress(task);
      const visibleSteps = getVisibleSteps(task);
      const isFullComplete = visibleSteps.length > 0 && assignedProgress === 100;

      // Jika task sudah completed dan punya step, tidak bisa di-uncheck
      if (task.status === 'completed' && task.has_substeps !== false) {
        toast({
          title: 'Cannot Uncheck Task',
          description: 'Cannot uncheck task with steps. Please manage steps individually.',
          variant: 'destructive',
        });
        return;
      }

      // Jika task belum completed, cek apakah semua step sudah selesai
      if (!isFullComplete && task.status !== 'completed') {
        toast({
          title: 'Cannot Complete Task',
          description: 'Please complete all assigned steps first',
          variant: 'destructive',
        });
        return;
      }

      // Jika semua step sudah selesai, baru bisa checklist task
      if (isFullComplete && task.status !== 'completed') {
        toast({
          title: 'Task Completed',
          description: `"${task.title}" has been marked as completed`,
        });
        updateTask(task.id, { status: 'completed' }).catch((err) => {
          console.error('Error updating task status:', err);
          toast({
            title: 'Error',
            description: 'Failed to update task status',
            variant: 'destructive',
          });
        });
      }
    },
    [calculateAssignedStepsProgress, getVisibleSteps, toast, updateTask]
  );

  const handlePriorityChange = useCallback(
    async (taskId: string, newPriority: Task['priority']) => {
      await updateTask(taskId, { priority: newPriority });
    },
    [updateTask]
  );

  const handleDeleteClick = useCallback((task: Task) => {
    setDeleteDialog({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title,
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteDialog.taskId) {
      await deleteTask(deleteDialog.taskId);
      setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
    }
  }, [deleteDialog.taskId, deleteTask]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
  }, []);

  const handleToggleReminder = useCallback(
    async (task: Task) => {
      const currentValue = task.has_reminder ?? false;
      const newReminderValue = !currentValue;

      // Jika ingin mengaktifkan reminder tapi belum ada due_date, buka date picker dulu
      if (newReminderValue && !task.due_date) {
        setReminderPendingTaskId(task.id);
        setDatePickerOpen(task.id);
        return;
      }

      await updateTask(task.id, { has_reminder: newReminderValue });
    },
    [updateTask]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      // Extract step IDs from the drag event
      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if we're reordering steps within a task
      if (activeId.startsWith('step-') && overId.startsWith('step-')) {
        const activeStepId = activeId.replace('step-', '');
        const overStepId = overId.replace('step-', '');

        // Find the task that contains these steps
        const task = tasks.find(
          (t) =>
            t.steps.some((s) => s.id === activeStepId) && t.steps.some((s) => s.id === overStepId)
        );

        if (task) {
          // Get the steps in their current order
          const sortedSteps = task.steps.sort((a, b) => a.order - b.order);
          const activeIndex = sortedSteps.findIndex((s) => s.id === activeStepId);
          const overIndex = sortedSteps.findIndex((s) => s.id === overStepId);

          if (activeIndex !== -1 && overIndex !== -1) {
            // Create new order array
            const newSteps = [...sortedSteps];
            const [removed] = newSteps.splice(activeIndex, 1);
            newSteps.splice(overIndex, 0, removed);

            // Extract step IDs in new order
            const stepIds = newSteps.map((step) => step.id);

            // Call reorder function
            reorderTaskSteps(task.id, stepIds);
          }
        }
      }
    },
    [tasks, reorderTaskSteps]
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col mobile-task-list px-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <TooltipProvider>
          <div className="flex flex-col">
            <div className="space-y-3 py-4 pb-16">
              {filteredTasks.length === 0 ? (
                <EmptyState />
              ) : (
                filteredTasks.map((task) => {
                  const isHighlighted = highlightedTask === task.id;
                  const visibleSteps = getVisibleSteps(task);
                  const progress = calculateAssignedStepsProgress(task);
                  const blockerCount = blockerCountByTask[task.id] || 0;

                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isHighlighted={isHighlighted}
                      visibleSteps={visibleSteps}
                      progress={progress}
                      blockerCount={blockerCount}
                      isTaskCreator={isTaskCreator(task)}
                      onToggleStatus={handleStatusToggle}
                      onOpenModal={openTaskModal}
                      onToggleReminder={handleToggleReminder}
                      onViewBlockers={openTaskBlockers}
                      onRequestExtension={(task) =>
                        setDeadlineDialog({ isOpen: true, taskId: task.id })
                      }
                      onEdit={(task) => setEditingTask(task.id)}
                      onDelete={handleDeleteClick}
                      taskRef={(el) => {
                        taskRefs.current[task.id] = el;
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Dialogs */}
          <DeadlineExtensionDialog
            isOpen={deadlineDialog.isOpen}
            onClose={() => setDeadlineDialog({ isOpen: false, taskId: null })}
            taskId={deadlineDialog.taskId}
            currentDeadline={
              deadlineDialog.taskId
                ? tasks.find((t) => t.id === deadlineDialog.taskId)?.due_date || null
                : null
            }
            onRequestExtension={requestDeadlineExtension}
          />

          <DeadlineHistoryDialog
            isOpen={historyDialog.isOpen}
            onClose={() => setHistoryDialog({ isOpen: false, taskId: null })}
            taskId={historyDialog.taskId}
            deadlineHistory={
              historyDialog.taskId
                ? tasks.find((t) => t.id === historyDialog.taskId)?.deadline_history || []
                : []
            }
          />

          <EditTaskDialog
            isOpen={editingTask !== null}
            onClose={() => setEditingTask(null)}
            taskId={editingTask}
          />

          {addStepDialog.taskId && (
            <ModalAddTaskStep
              open={addStepDialog.isOpen}
              onOpenChange={(open) =>
                setAddStepDialog({ isOpen: open, taskId: null, taskTitle: '' })
              }
              taskId={addStepDialog.taskId}
              taskTitle={addStepDialog.taskTitle}
              onSuccess={() => {
                // Optionally refresh or do something after success
              }}
            />
          )}

          <DeleteTaskDialog
            isOpen={deleteDialog.isOpen}
            taskTitle={deleteDialog.taskTitle}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />

          <BlockerDetailsModal
            open={blockerModalOpen}
            onOpenChange={setBlockerModalOpen}
            items={blockerModalItems}
            initialTab={'list'}
          />

          {activeTask && (
            <TaskDetailModal
              task={activeTask}
              visibleSteps={activeVisibleSteps}
              progress={activeProgress}
              isOverdue={activeIsOverdue}
              daysRemaining={activeDaysRemaining}
              blockerCount={activeBlockerCount}
              userId={currentUserId}
              onClose={closeTaskModal}
              onToggleReminder={handleToggleReminder}
              onViewBlockers={openTaskBlockers}
              onViewHistory={(taskId) => setHistoryDialog({ isOpen: true, taskId })}
              onRequestExtension={(taskId) => setDeadlineDialog({ isOpen: true, taskId })}
              onEdit={(taskId) => setEditingTask(taskId)}
              onDelete={handleDeleteClick}
              onPriorityChange={handlePriorityChange}
              onAddStep={(taskId, taskTitle) =>
                setAddStepDialog({ isOpen: true, taskId, taskTitle })
              }
            />
          )}

          <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex justify-end px-6">
            <Button
              onClick={() => setIsCreateTaskDialogOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          <CreateTaskDialog
            open={isCreateTaskDialogOpen}
            onOpenChange={setIsCreateTaskDialogOpen}
          />
        </TooltipProvider>
      </DndContext>
    </div>
  );
};
