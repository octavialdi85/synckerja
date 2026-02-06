import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/features/ui/table';
import { TooltipProvider } from '@/features/ui/tooltip';
import { useDailyTask } from '../DailyTaskContext';
import { type Task } from '../types';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useToast } from '@/features/ui/use-toast';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { format } from 'date-fns';
import {
  TaskListTableHeader,
  TaskListRow,
  TaskListDialogs,
  isTaskFullyCompleteBySteps,
} from './TaskList/index';
import { useTaskListBlockers } from '../hooks/useTaskListBlockers';
import { useTaskListDepartments } from '../hooks/useTaskListDepartments';
import './TaskList.css';

export const TaskList = () => {
  const context = useDailyTask();
  const {
    tasks,
    effectiveFilteredTasks,
    getVisibleStepsEffective,
    filters,
    setFilters,
    updateTask,
    deleteTask,
    reorderTaskSteps,
    expandedTasks,
    setExpandedTasks,
    highlightedTask,
    highlightFromPendingApproval,
  } = context;
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const { user } = useCurrentUser();
  const { toast } = useToast();

  const departmentMap = useTaskListDepartments(tasks);
  const {
    blockerCountByTask,
    blockerModalOpen,
    setBlockerModalOpen,
    blockerModalItems,
    openTaskBlockers,
    fetchBlockerCountForTasks,
    blockerCountFetchedForRef,
  } = useTaskListBlockers(effectiveFilteredTasks, getVisibleStepsEffective);

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
  const taskRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedTask && taskRefs.current[highlightedTask] && scrollContainerRef.current) {
      const taskElement = taskRefs.current[highlightedTask];
      const scrollContainer = scrollContainerRef.current;
      if (taskElement) {
        setTimeout(() => {
          const taskRect = taskElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const isVisible =
            taskRect.top >= containerRect.top && taskRect.bottom <= containerRect.bottom;
          if (!isVisible) {
            const scrollTop =
              scrollContainer.scrollTop +
              (taskRect.top - containerRect.top) -
              containerRect.height / 2 +
              taskRect.height / 2;
            scrollContainer.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
          }
        }, 150);
      }
    }
  }, [highlightedTask]);

  const toggleTaskExpansion = (taskId: string) => {
    const isOpen = expandedTasks.has(taskId);
    if (isOpen) {
      setExpandedTasks(new Set());
    } else {
      setExpandedTasks(new Set([taskId]));
      const ids = effectiveFilteredTasks.map((t) => t.id);
      const idx = ids.indexOf(taskId);
      const toFetch: string[] = [taskId];
      for (let i = 1; i <= 4 && idx + i < ids.length; i++) {
        const nextId = ids[idx + i];
        if (nextId && !blockerCountFetchedForRef.current.has(nextId)) toFetch.push(nextId);
      }
      fetchBlockerCountForTasks(toFetch);
    }
  };

  const handleStatusToggle = (task: Task) => {
    if (task.has_substeps === false) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      if (newStatus !== task.status) {
        toast({
          title: newStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
          description: `"${task.title}" has been ${newStatus === 'completed' ? 'marked as completed' : 'reopened'}`,
        });
        updateTask(task.id, { status: newStatus }).catch(() => {
          toast({ title: 'Error', description: 'Failed to update task status', variant: 'destructive' });
        });
      }
      return;
    }
    const isFullComplete = isTaskFullyCompleteBySteps(task);
    const newStatus = isFullComplete
      ? task.status === 'completed'
        ? 'pending'
        : 'completed'
      : 'pending';
    if (newStatus !== task.status) {
      toast({
        title: newStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
        description: `"${task.title}" has been ${newStatus === 'completed' ? 'marked as completed' : 'reopened'}`,
      });
      updateTask(task.id, { status: newStatus }).catch(() => {
        toast({ title: 'Error', description: 'Failed to update task status', variant: 'destructive' });
      });
    } else if (!isFullComplete && task.status !== 'completed') {
      toast({
        title: 'Cannot Complete Task',
        description: 'Please complete all assigned steps first',
        variant: 'destructive',
      });
    }
  };

  const handleDateChange = async (taskId: string, date: Date) => {
    const updateData: Partial<Task> = { due_date: format(date, 'yyyy-MM-dd') };
    if (reminderPendingTaskId === taskId) {
      updateData.has_reminder = true;
      setReminderPendingTaskId(null);
    }
    await updateTask(taskId, updateData);
    setDatePickerOpen(null);
  };

  const handleClearDate = async (taskId: string) => {
    await updateTask(taskId, { due_date: null });
    setDatePickerOpen(null);
  };

  const handlePriorityChange = async (taskId: string, newPriority: Task['priority']) => {
    await updateTask(taskId, { priority: newPriority });
  };

  const handleDeleteClick = (task: Task) => {
    setDeleteDialog({ isOpen: true, taskId: task.id, taskTitle: task.title });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.taskId) {
      await deleteTask(deleteDialog.taskId);
      setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
  };

  const handleToggleReminder = async (task: Task) => {
    const currentValue = task.has_reminder ?? false;
    const newReminderValue = !currentValue;
    if (newReminderValue && !task.due_date) {
      setReminderPendingTaskId(task.id);
      setDatePickerOpen(task.id);
      return;
    }
    await updateTask(task.id, { has_reminder: newReminderValue });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId.startsWith('step-') && overId.startsWith('step-')) {
      const activeStepId = activeId.replace('step-', '');
      const overStepId = overId.replace('step-', '');
      const task = tasks.find(
        (t) =>
          t.steps.some((s) => s.id === activeStepId) && t.steps.some((s) => s.id === overStepId)
      );
      if (task) {
        const sortedSteps = task.steps.sort((a, b) => a.order - b.order);
        const activeIndex = sortedSteps.findIndex((s) => s.id === activeStepId);
        const overIndex = sortedSteps.findIndex((s) => s.id === overStepId);
        if (activeIndex !== -1 && overIndex !== -1) {
          const newSteps = [...sortedSteps];
          const [removed] = newSteps.splice(activeIndex, 1);
          newSteps.splice(overIndex, 0, removed);
          const stepIds = newSteps.map((step) => step.id);
          reorderTaskSteps(task.id, stepIds);
        }
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <TooltipProvider>
        <div className="h-full flex flex-col">
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 seamless-scroll overflow-auto"
          >
            <table className="w-full caption-bottom text-sm task-list-table">
              <TaskListTableHeader />
              <TableBody>
                {effectiveFilteredTasks.length === 0 ? (
                  <TableRow className="w-full">
                    <TableCell
                      colSpan={13}
                      className="text-center py-8 text-gray-500 w-full"
                      style={{ width: '100%' }}
                    >
                      <div className="flex flex-col items-center w-full gap-2">
                        <CheckSquare className="w-8 h-8 text-gray-300" />
                        <p>No tasks found</p>
                        {tasks.length > 0 ? (
                          <>
                            <p className="text-sm text-gray-400">
                              No tasks match your current filters. Try &quot;All tasks&quot; or clear filters.
                            </p>
                            <button
                              type="button"
                              onClick={() => setFilters((prev) => ({ ...prev, myTask: 'all', pic: '', search: '', status: '', priority: '', dateRange: undefined, planDateRange: undefined }))}
                              className="text-sm text-primary hover:underline"
                            >
                              Show all tasks
                            </button>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Create your first task to get started</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  effectiveFilteredTasks.map((task) => (
                    <TaskListRow
                      key={task.id}
                      task={task}
                      isExpanded={expandedTasks.has(task.id)}
                      isHighlighted={highlightedTask === task.id}
                      isHighlightedFromPendingApproval={highlightFromPendingApproval && highlightedTask === task.id}
                      department={departmentMap[task.id]}
                      blockerCount={blockerCountByTask[task.id] ?? 0}
                      filters={filters}
                      getVisibleSteps={getVisibleStepsEffective}
                      rowRef={(el) => {
                        taskRefs.current[task.id] = el;
                      }}
                      datePickerOpen={datePickerOpen}
                      reminderPendingTaskId={reminderPendingTaskId}
                      onToggleExpansion={toggleTaskExpansion}
                      onStatusToggle={handleStatusToggle}
                      onOpenBlockers={openTaskBlockers}
                      onDateChange={handleDateChange}
                      onClearDate={handleClearDate}
                      onPriorityChange={handlePriorityChange}
                      onDeleteClick={handleDeleteClick}
                      onToggleReminder={handleToggleReminder}
                      setDatePickerOpen={setDatePickerOpen}
                      setReminderPendingTaskId={setReminderPendingTaskId}
                      setHistoryDialog={setHistoryDialog}
                      setDeadlineDialog={setDeadlineDialog}
                      setEditingTask={setEditingTask}
                      setAddStepDialog={setAddStepDialog}
                      userId={user?.id}
                    />
                  ))
                )}
              </TableBody>
            </table>
          </div>

          <TaskListDialogs
            tasks={tasks}
            deadlineDialog={deadlineDialog}
            setDeadlineDialog={setDeadlineDialog}
            historyDialog={historyDialog}
            setHistoryDialog={setHistoryDialog}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            addStepDialog={addStepDialog}
            setAddStepDialog={setAddStepDialog}
            deleteDialog={deleteDialog}
            handleCancelDelete={handleCancelDelete}
            handleConfirmDelete={handleConfirmDelete}
            blockerModalOpen={blockerModalOpen}
            setBlockerModalOpen={setBlockerModalOpen}
            blockerModalItems={blockerModalItems}
            requestDeadlineExtension={requestDeadlineExtension}
          />
        </div>
      </TooltipProvider>
    </DndContext>
  );
};
