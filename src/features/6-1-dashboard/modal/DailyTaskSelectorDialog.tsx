import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { CalendarIcon, Search, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { AssignSocialMediaPlanModal } from './AssignSocialMediaPlanModal';
import { toast } from 'sonner';

interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

interface DailyTaskSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (dailyTaskId: string, title: string, employeeId?: string, assignedAt?: string) => Promise<void>;
  dueDate?: string | null; // Due date from post_date in social_media_plans
}

const DailyTaskSelectorDialog: React.FC<DailyTaskSelectorDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  dueDate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ employeeId?: string; assignedAt?: string } | null>(null);
  const { organizationId } = useCurrentOrg();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();
  
  // Check if user can assign employees (Owner/Admin only)
  const canAssignEmployees = isOwner || isAdmin || userRole === 'owner' || userRole === 'admin';

  const fetchDailyTasks = React.useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('daily_tasks')
        .select('id, title, description, status, priority, due_date, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Filter by month if selected
      if (selectedMonth) {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const startDateStr = format(monthStart, 'yyyy-MM-dd');
        const endDateStr = format(monthEnd, 'yyyy-MM-dd');
        
        // Filter tasks where due_date is within the selected month
        query = query
          .gte('due_date', startDateStr)
          .lte('due_date', endDateStr);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search query
      let filteredTasks = data || [];
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        filteredTasks = filteredTasks.filter(
          (task) =>
            task.title.toLowerCase().includes(searchLower) ||
            (task.description && task.description.toLowerCase().includes(searchLower))
        );
      }

      setDailyTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast.error('Failed to load daily tasks');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, selectedMonth, searchQuery]);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchDailyTasks();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedMonth(undefined);
      setDailyTasks([]);
      setSelectedTaskId(null);
    }
  }, [isOpen, organizationId, fetchDailyTasks]);

  // Handle month selection - when user clicks any date, filter by that month
  const handleMonthClick = (date: Date | undefined) => {
    if (date) {
      // Set to first day of the selected month for filtering
      const monthStart = startOfMonth(date);
      setSelectedMonth(monthStart);
    } else {
      setSelectedMonth(undefined);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectTask = async () => {
    if (!selectedTaskId) {
      toast.error('Please select a daily task');
      return;
    }

    const selectedTask = dailyTasks.find((task) => task.id === selectedTaskId);
    if (!selectedTask) {
      toast.error('Selected task not found');
      return;
    }

    // If Owner/Admin, show assignment modal
    if (canAssignEmployees) {
      setPendingAssignment({});
      setShowAssignModal(true);
      return;
    }

    // Regular employee: directly assign to active profile
    setIsSubmitting(true);
    try {
      await onSelect(selectedTaskId, selectedTask.title);
      toast.success('Content title added as daily task step successfully');
      onClose();
    } catch (error) {
      console.error('Error selecting task:', error);
      toast.error('Failed to add as daily task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (assignment: { employeeId: string; assignedAt: string }) => {
    if (!selectedTaskId) {
      toast.error('Please select a daily task');
      return;
    }

    const selectedTask = dailyTasks.find((task) => task.id === selectedTaskId);
    if (!selectedTask) {
      toast.error('Selected task not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSelect(selectedTaskId, selectedTask.title, assignment.employeeId, assignment.assignedAt);
      toast.success('Content title added as daily task step successfully');
      setShowAssignModal(false);
      setPendingAssignment(null);
      onClose();
    } catch (error) {
      console.error('Error selecting task:', error);
      toast.error('Failed to add as daily task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto seamless-scroll">
        <DialogHeader>
          <DialogTitle>Select Daily Task</DialogTitle>
          <DialogDescription>
            Choose a daily task to reference this content title
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search daily tasks..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Month Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !selectedMonth && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'Filter by month'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={handleMonthClick}
                    initialFocus
                    classNames={{
                      caption_label: 'text-sm font-medium cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors',
                    }}
                    components={{
                      CaptionLabel: ({ displayMonth, ...props }: any) => {
                        const handleCaptionClick = (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const monthStart = startOfMonth(displayMonth);
                          setSelectedMonth(monthStart);
                        };
                        return (
                          <button
                            type="button"
                            onClick={handleCaptionClick}
                            className="text-sm font-medium cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                            {...props}
                          >
                            {format(displayMonth, 'MMMM yyyy')}
                          </button>
                        );
                      },
                    }}
                  />
                </div>
                {selectedMonth && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMonth(undefined)}
                      className="w-full"
                    >
                      Clear month filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Task List */}
          <div className="border rounded-lg max-h-[400px] overflow-y-auto seamless-scroll">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading daily tasks...</span>
              </div>
            ) : dailyTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {searchQuery || selectedMonth
                  ? 'No daily tasks found matching your filters'
                  : 'No daily tasks available'}
              </div>
            ) : (
              <div className="divide-y">
                {dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedTaskId === task.id && 'bg-blue-50 border-l-4 border-blue-500'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              getStatusColor(task.status)
                            )}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium border',
                              getPriorityColor(task.priority)
                            )}
                          >
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-gray-500">
                              Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          selectedTaskId === task.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        )}
                      >
                        {selectedTaskId === task.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSelectTask}
              disabled={!selectedTaskId || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add as Daily Task'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Assignment Modal for Owner/Admin */}
      {canAssignEmployees && selectedTaskId && (
        <AssignSocialMediaPlanModal
          open={showAssignModal}
          onOpenChange={setShowAssignModal}
          onAssign={handleAssign}
          dueDate={dueDate || null}
          taskTitle={dailyTasks.find((task) => task.id === selectedTaskId)?.title || ''}
        />
      )}
    </Dialog>
  );
};

export default DailyTaskSelectorDialog;

