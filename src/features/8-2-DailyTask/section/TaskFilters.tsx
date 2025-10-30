import React from 'react';
import { Search, FilterX } from 'lucide-react';
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

export const TaskFilters = () => {
  const { filters, setFilters } = useDailyTask();

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handlePriorityChange = (value: string) => {
    setFilters(prev => ({ ...prev, priority: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      dateFilter: ''
    });
  };

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search tasks and steps..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Status Filter */}
      <Select value={filters.status || "all"} onValueChange={(value) => handleStatusChange(value === "all" ? "" : value)}>
        <SelectTrigger className="w-40 border border-gray-200 rounded-lg">
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
        <SelectTrigger className="w-40 border border-gray-200 rounded-lg">
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

      {/* Clear Filters Button */}
      {(filters.search || filters.status || filters.priority) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          title="Clear Filters"
        >
          <FilterX className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

