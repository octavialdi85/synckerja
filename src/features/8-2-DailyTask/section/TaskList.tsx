import React, { useState, useRef, useEffect } from 'react';
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
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  History,
  Clock3,
  Paperclip,
  Target
} from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
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
import { useDailyTask, type Task } from '../DailyTaskContext';

interface DeadlineHistory {
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
import { TaskStep } from './TaskStep';
import { DeadlineExtensionDialog } from './DeadlineExtensionDialog';
import { DeadlineHistoryDialog } from './DeadlineHistoryDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { ModalAddTaskStep } from './ModalAddTaskStep';
import './TaskList.css';
import { format } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const TaskList = () => {
  const context = useDailyTask();
  const { tasks, filters, updateTask, deleteTask, addTaskStep, reorderTaskSteps, expandedTasks, setExpandedTasks, highlightedTask } = context;
  const requestDeadlineExtension = (context as any).requestDeadlineExtension;
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [deadlineDialog, setDeadlineDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
  const [addStepDialog, setAddStepDialog] = useState<{ isOpen: boolean; taskId: string | null; taskTitle: string }>({ isOpen: false, taskId: null, taskTitle: '' });
  const taskRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted task
  useEffect(() => {
    if (highlightedTask && taskRefs.current[highlightedTask] && scrollContainerRef.current) {
      const taskElement = taskRefs.current[highlightedTask];
      const scrollContainer = scrollContainerRef.current;
      
      if (taskElement) {
        // Add a small delay to ensure the DOM has updated
        setTimeout(() => {
          const taskRect = taskElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          
          // Check if task is visible in the container
          const isVisible = taskRect.top >= containerRect.top && 
                           taskRect.bottom <= containerRect.bottom;
          
          if (!isVisible) {
            // Calculate scroll position to center the task
            const scrollTop = scrollContainer.scrollTop + 
                            (taskRect.top - containerRect.top) - 
                            (containerRect.height / 2) + 
                            (taskRect.height / 2);
            
            scrollContainer.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }, 150);
      }
    }
  }, [highlightedTask]);

  // Filter tasks based on filters
  const filteredTasks = tasks.filter(task => {
    // Search filter - now includes both task title and step titles
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const taskTitleMatch = task.title?.toLowerCase().includes(searchTerm) || false;
      const taskDescriptionMatch = task.description?.toLowerCase().includes(searchTerm) || false;
      const stepMatch = task.steps?.some(step => 
        step.title?.toLowerCase().includes(searchTerm)
      ) || false;
      
      if (!taskTitleMatch && !taskDescriptionMatch && !stepMatch) {
        return false;
      }
    }
    
    if (filters.status && task.status !== filters.status) {
      return false;
    }
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  const toggleTaskExpansion = (taskId: string) => {
    const isOpen = expandedTasks.has(taskId);
    if (isOpen) {
      setExpandedTasks(new Set());
    } else {
      setExpandedTasks(new Set([taskId]));
    }
  };

  const handleStatusToggle = async (task: Task) => {
    const isFullComplete = (task.steps?.length || 0) > 0 && task.progress_percentage === 100;
    const newStatus = isFullComplete ? (task.status === 'completed' ? 'pending' : 'completed') : 'pending';
    if (newStatus !== task.status) {
      await updateTask(task.id, { status: newStatus });
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
      <Badge className={`${variants[status] || ''} px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap hover:bg-inherit hover:text-inherit hover:opacity-100`}>
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
      <Badge className={`${variants[priority] || ''} px-2 py-1 text-xs font-medium rounded-md hover:bg-inherit hover:text-inherit hover:opacity-100`}>
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

  const handleDateChange = async (taskId: string, date: Date) => {
    await updateTask(taskId, { due_date: format(date, 'yyyy-MM-dd') });
    setDatePickerOpen(null);
  };

  const handleClearDate = async (taskId: string) => {
    await updateTask(taskId, { due_date: null });
    setDatePickerOpen(null);
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    await updateTask(taskId, { priority: newPriority });
  };

  const onDragEnd = (event: DragEndEvent) => {
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
      const task = tasks.find(t => 
        t.steps.some(s => s.id === activeStepId) && 
        t.steps.some(s => s.id === overStepId)
      );
      
      if (task) {
        // Get the steps in their current order
        const sortedSteps = task.steps.sort((a, b) => a.order - b.order);
        const activeIndex = sortedSteps.findIndex(s => s.id === activeStepId);
        const overIndex = sortedSteps.findIndex(s => s.id === overStepId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          // Create new order array
          const newSteps = [...sortedSteps];
          const [removed] = newSteps.splice(activeIndex, 1);
          newSteps.splice(overIndex, 0, removed);
          
          // Extract step IDs in new order
          const stepIds = newSteps.map(step => step.id);
          
          // Call reorder function
          reorderTaskSteps(task.id, stepIds);
        }
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <TooltipProvider>
        <div className="h-full flex flex-col">
        <div ref={scrollContainerRef} className="flex-1 min-h-0 seamless-scroll overflow-auto">
          <table className="w-full caption-bottom text-sm task-list-table">
            <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                  <span className="sr-only">Expand</span>
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                  <span className="sr-only">Complete</span>
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                  Task Title
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  PIC
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Due Date
                </TableHead>
                <TableHead className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Finish Date
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}>
                  Priority
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                  Status
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                  Progress
                </TableHead>
                <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center">
                      <CheckSquare className="w-8 h-8 mb-2 text-gray-300" />
                      <p>No tasks found</p>
                      <p className="text-sm text-gray-400">Create your first task to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
        const isExpanded = expandedTasks.has(task.id);
        const isOverdueTask = isOverdue(task.due_date, task.status);
        const isHighlighted = highlightedTask === task.id;
        
        return (
                    <React.Fragment key={task.id}>
                      {/* Main Task Row */}
                      <TableRow 
                        ref={(el) => { taskRefs.current[task.id] = el; }}
                        className={`w-full hover:bg-gray-50 transition-all duration-300 ${
                          isHighlighted 
                            ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-md' 
                            : ''
                        }`}
                      >
                        {/* Expand/Collapse Button */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpansion(task.id)}
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
                        <TableCell className="px-2 py-3 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                          <button
                            onClick={() => handleStatusToggle(task)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            title={task.progress_percentage === 100 ? 'Mark complete / reopen' : 'Complete all steps to mark task complete'}
                          >
                            {task.progress_percentage === 100 ? (
                              <CheckSquare className="w-5 h-5 text-green-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </TableCell>

                        {/* Task Title */}
                        <TableCell className="px-2 py-3" style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={`text-sm font-medium cursor-pointer hover:text-blue-600 truncate flex items-center gap-2 ${
                                  task.progress_percentage === 100 ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}
                                onClick={() => toggleTaskExpansion(task.id)}
                              >
                                {isHighlighted && (
                                  <Target className="w-4 h-4 text-blue-600 animate-pulse" />
                                )}
                                {task.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              align="start"
                              className="max-w-md p-4 bg-gray-900 text-white shadow-lg border-gray-700"
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-300 mt-2 border-t border-gray-700 pt-2">
                                  {task.description}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {task.steps.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {task.steps.filter(s => s.is_completed).length}/{task.steps.length} steps
                      </div>
                    )}
                    {task.files.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {task.files.length} files
                      </div>
                    )}
                  </div>
                        </TableCell>

                        {/* PIC (Person In Charge) */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex items-center">
                            {task.assigned_to_name ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-900 font-medium">
                                  {task.assigned_to_name}
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
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          <Popover 
                            open={datePickerOpen === task.id} 
                            onOpenChange={(open) => setDatePickerOpen(open ? task.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={`h-auto p-1 hover:bg-gray-100 rounded-md transition-colors ${
                                  isOverdueTask ? 'text-red-600 font-medium hover:bg-red-50' : 'text-gray-600'
                                }`}
                              >
                                {task.due_date ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span className="text-sm">{formatDate(task.due_date)}</span>
                                    </div>
                                    {isOverdueTask && (
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
                                  selected={task.due_date ? new Date(task.due_date) : undefined}
                                  onSelect={(date) => handleDateChange(task.id, date)}
                                  className="border-0 shadow-none"
                                />
                                {task.due_date && (
                                  <div className="flex justify-center pt-2 border-t mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleClearDate(task.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Clear Date
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Finish Date */}
                        <TableCell className="px-2 py-3 text-left" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {task.finish_date && task.progress_percentage === 100 ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">
                                  {formatDate(task.finish_date)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Priority */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="priority-dropdown-trigger h-auto p-1 hover:bg-gray-50 rounded-md transition-colors hover:text-inherit"
                              >
                                {getPriorityBadge(task.priority)}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-32">
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'low')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-green-600" />
                                <span className="text-green-700">Low</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'medium')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-700">Medium</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'high')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-orange-600" />
                                <span className="text-orange-700">High</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePriorityChange(task.id, 'urgent')}
                                className="flex items-center gap-2"
                              >
                                <Flag className="w-3 h-3 text-red-600" />
                                <span className="text-red-700">Urgent</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                          {getStatusBadge(task.status)}
                        </TableCell>

                        {/* Progress */}
                        <TableCell className="px-2 py-3" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-xs text-gray-500">
                    {task.steps.length > 0 ? `${task.progress_percentage}%` : 'No steps'}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        task.progress_percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${task.steps.length > 0 ? task.progress_percentage : 0}%` }}
                    />
                  </div>
                </div>
                        </TableCell>
                
                {/* Actions */}
                        <TableCell className="px-2 py-3 text-center" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                          <div className="flex items-center justify-center gap-1">
                            {/* History Icon */}
                            {task.deadline_history && task.deadline_history.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHistoryDialog({ isOpen: true, taskId: task.id })}
                                className="h-7 w-7 p-0 hover:bg-gray-50 hover:text-gray-600"
                                title="View deadline history"
                              >
                                <History className="w-3 h-3" />
                              </Button>
                            )}
                            
                            {/* Request Deadline Extension */}
                            {task.status !== 'completed' && task.due_date && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeadlineDialog({ isOpen: true, taskId: task.id })}
                                className="h-7 w-7 p-0 hover:bg-orange-50 hover:text-orange-600"
                                title="Request deadline extension"
                              >
                                <Clock3 className="w-3 h-3" />
                              </Button>
                            )}
                            
                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTask(task.id)}
                              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
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
                          <TableCell colSpan={10} className={`w-full px-4 py-4 border-t border-blue-200 transition-all duration-300 ${
                            isHighlighted 
                              ? 'bg-blue-100 border-l-4 border-l-blue-500' 
                              : 'bg-blue-50'
                          }`}>
                {task.description && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                )}
                
                <div className="w-full space-y-4">
                  {/* Steps Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        Steps ({task.steps.filter(s => s.is_completed).length}/{task.steps.length})
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAddStepDialog({ isOpen: true, taskId: task.id, taskTitle: task.title });
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Add a new step to this task"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Step
                      </Button>
                    </div>
                    
                    <SortableContext items={task.steps.map(step => `step-${step.id}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 min-h-[50px]">
                        {task.steps.length === 0 ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <CheckSquare className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                            <p className="text-sm font-medium text-blue-900 mb-1">No steps yet</p>
                            <p className="text-xs text-blue-700">
                              Break down this task into smaller steps for better tracking
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              👆 Click "Add Step" button above to get started
                            </p>
                          </div>
                        ) : (
                          task.steps
                            .sort((a, b) => a.order - b.order)
                            .map((step, index) => (
                              <TaskStep key={step.id} step={step} index={index} />
                            ))
                        )}
                      </div>
                    </SortableContext>
                  </div>

                </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </table>
        </div>

        {/* Deadline Extension Dialog */}
        <DeadlineExtensionDialog
          isOpen={deadlineDialog.isOpen}
          onClose={() => setDeadlineDialog({ isOpen: false, taskId: null })}
          taskId={deadlineDialog.taskId}
          currentDeadline={deadlineDialog.taskId ? tasks.find(t => t.id === deadlineDialog.taskId)?.due_date || null : null}
          onRequestExtension={requestDeadlineExtension}
        />

        {/* Deadline History Dialog */}
        <DeadlineHistoryDialog
          isOpen={historyDialog.isOpen}
          onClose={() => setHistoryDialog({ isOpen: false, taskId: null })}
          taskId={historyDialog.taskId}
          deadlineHistory={historyDialog.taskId ? tasks.find(t => t.id === historyDialog.taskId)?.deadline_history || [] : []}
        />

        {/* Edit Task Dialog */}
        <EditTaskDialog
          isOpen={editingTask !== null}
          onClose={() => setEditingTask(null)}
          taskId={editingTask}
        />

        {/* Add Step Modal */}
        {addStepDialog.taskId && (
          <ModalAddTaskStep
            open={addStepDialog.isOpen}
            onOpenChange={(open) => setAddStepDialog({ isOpen: open, taskId: null, taskTitle: '' })}
            taskId={addStepDialog.taskId}
            taskTitle={addStepDialog.taskTitle}
            onSuccess={() => {
              // Optionally refresh or do something after success
            }}
          />
        )}
        </div>
      </TooltipProvider>
    </DndContext>
  );
};
