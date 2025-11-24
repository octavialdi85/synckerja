import React, { useMemo, useState } from 'react';
import { Search, FilterX, CalendarIcon, Plus } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { useDailyTask } from '../DailyTaskContext';
import { CustomDatePicker } from '@/mobile/components/CustomDatePicker';
import { format } from 'date-fns';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { CreateTaskDialog } from './CreateTaskDialog';

interface TaskFiltersProps {
  onAddTask?: () => void;
  showAddTaskButton?: boolean;
}

export const TaskFilters = ({ onAddTask, showAddTaskButton = true }: TaskFiltersProps = {}) => {
  const { filters, setFilters, tasks } = useDailyTask();
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const { isOwner } = useCentralizedUserData();

  // Get unique employees from all task steps for PIC filter
  const availableEmployees = useMemo(() => {
    const employeeMap = new Map<string, { id: string; full_name: string }>();
    
    tasks.forEach(task => {
      task.steps?.forEach(step => {
        if (step.assigned_employee && step.assigned_employee.id) {
          employeeMap.set(step.assigned_employee.id, {
            id: step.assigned_employee.id,
            full_name: step.assigned_employee.full_name || 'Unknown'
          });
        }
      });
    });
    
    return Array.from(employeeMap.values()).sort((a, b) => 
      a.full_name.localeCompare(b.full_name)
    );
  }, [tasks]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handlePriorityChange = (value: string) => {
    setFilters(prev => ({ ...prev, priority: value }));
  };

  const handleTaskViewChange = (value: string) => {
    if (value === 'my_task') {
      setFilters(prev => ({ ...prev, myTask: 'my_task', pic: '' }));
    } else if (value === 'all_pic') {
      setFilters(prev => ({ ...prev, myTask: 'all', pic: '' }));
    } else {
      // Individual PIC selected
      setFilters(prev => ({ ...prev, myTask: 'all', pic: value }));
    }
  };

  // Get current selected value for combined dropdown
  const getCurrentTaskViewValue = () => {
    if (filters.myTask === 'my_task') {
      return 'my_task';
    }
    if (filters.pic) {
      return filters.pic;
    }
    return 'all_pic';
  };

  // Get display text for combined dropdown
  const getTaskViewDisplayText = () => {
    if (filters.myTask === 'my_task') {
      return 'My Task';
    }
    if (filters.pic) {
      const selectedEmployee = availableEmployees.find(emp => emp.id === filters.pic);
      return selectedEmployee ? selectedEmployee.full_name : 'All PIC';
    }
    return 'All PIC';
  };

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomDatePickerOpen(true);
    } else {
      setFilters(prev => ({ 
        ...prev, 
        dateRange: value === "all" ? undefined : value as any,
        customStartDate: undefined,
        customEndDate: undefined
      }));
    }
  };

  const handleCustomDateRangeSelect = (startDate: Date, endDate: Date) => {
    setFilters(prev => ({ 
      ...prev, 
      dateRange: 'custom',
      customStartDate: format(startDate, 'yyyy-MM-dd'),
      customEndDate: format(endDate, 'yyyy-MM-dd')
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      dateFilter: '',
      dateRange: undefined,
      customStartDate: undefined,
      customEndDate: undefined,
      pic: '',
      myTask: filters.myTask || 'my_task' // Preserve myTask preference (from localStorage)
    });
  };

  const getDateRangeDisplayText = () => {
    if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      const start = new Date(filters.customStartDate);
      const end = new Date(filters.customEndDate);
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
    }
    if (filters.dateRange) {
      const labels: Record<string, string> = {
        'today': 'Today',
        'yesterday': 'Yesterday',
        'this_week': 'This Week',
        'this_month': 'This Month',
        'last_month': 'Last Month'
      };
      return labels[filters.dateRange] || 'Custom Range';
    }
    return 'All Dates';
  };

  return (
    <div className="w-full">
      <div className="p-2 bg-white border border-gray-200 rounded-md">
        <div className="flex flex-wrap gap-1 items-center">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search tasks and steps..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 pr-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Combined My Task / All PIC Filter */}
      <Select value={getCurrentTaskViewValue()} onValueChange={handleTaskViewChange}>
        <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="My Task" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="my_task">My Task</SelectItem>
          {isOwner && (
            <>
              <SelectItem value="all_pic">All PIC</SelectItem>
              {availableEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={filters.status || "all"} onValueChange={(value) => handleStatusChange(value === "all" ? "" : value)}>
        <SelectTrigger className="w-full sm:w-32 lg:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select value={filters.priority || "all"} onValueChange={(value) => handlePriorityChange(value === "all" ? "" : value)}>
        <SelectTrigger className="w-full sm:w-32 lg:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="All Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select 
        value={filters.dateRange || "all"} 
        onValueChange={handleDateRangeChange}
      >
        <SelectTrigger className="w-auto min-w-[160px] max-w-[220px] h-9 text-sm text-gray-700 text-left whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <SelectValue placeholder="All Dates" className="truncate">
              {getDateRangeDisplayText()}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {(filters.search || filters.status || filters.priority || filters.pic || filters.dateRange || (filters.myTask && filters.myTask !== 'my_task')) && (
        <button
          onClick={clearFilters}
          className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center ml-auto"
          title="Clear filters"
        >
          <FilterX className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* Add Task Button */}
      {showAddTaskButton && (
        <Button
          onClick={() => setIsCreateTaskDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      )}

      {/* Custom Date Picker Dialog */}
      <CustomDatePicker
        isOpen={isCustomDatePickerOpen}
        onClose={() => setIsCustomDatePickerOpen(false)}
        onDateRangeSelect={handleCustomDateRangeSelect}
        initialStartDate={filters.customStartDate ? new Date(filters.customStartDate) : undefined}
        initialEndDate={filters.customEndDate ? new Date(filters.customEndDate) : undefined}
      />

      {/* Create Task Dialog */}
      {showAddTaskButton && (
        <CreateTaskDialog
          open={isCreateTaskDialogOpen}
          onOpenChange={(open) => {
            setIsCreateTaskDialogOpen(open);
            if (onAddTask && !open) {
              onAddTask();
            }
          }}
        />
      )}
    </div>
      </div>
    </div>
  );
};

