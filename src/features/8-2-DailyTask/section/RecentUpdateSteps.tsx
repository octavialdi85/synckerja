import React, { useState } from 'react';
import { CheckSquare, Clock, Edit, Plus, RotateCcw, Filter, Calendar, X } from 'lucide-react';
import { useDailyTask } from '../DailyTaskContext';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';

const RecentUpdateSteps = () => {
  const { filteredRecentStepUpdates, recentStepFilters, setRecentStepFilters, isLoading } = useDailyTask();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getActionIcon = (action: string, isCompleted: boolean) => {
    switch (action) {
      case 'completed':
        return <CheckSquare className="w-3 h-3 text-green-600" />;
      case 'created':
        return <Plus className="w-3 h-3 text-blue-600" />;
      case 'reopened':
        return <RotateCcw className="w-3 h-3 text-orange-600" />;
      case 'updated':
      default:
        return <Edit className="w-3 h-3 text-gray-600" />;
    }
  };

  const getActionText = (action: string, isCompleted: boolean) => {
    switch (action) {
      case 'completed':
        return 'Completed';
      case 'created':
        return 'Created';
      case 'reopened':
        return 'Reopened';
      case 'updated':
      default:
        return 'Updated';
    }
  };

  const getActionColor = (action: string, isCompleted: boolean) => {
    switch (action) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'created':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'reopened':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'updated':
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Step Updates
        </h4>
        <div className="text-center text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setRecentStepFilters(prev => ({
        ...prev,
        dateRange: value as any,
        customStartDate: undefined,
        customEndDate: undefined
      }));
    }
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setRecentStepFilters(prev => ({
      ...prev,
      dateRange: 'custom',
      customStartDate: startDate,
      customEndDate: endDate
    }));
    setShowCustomDatePicker(false);
  };

  const clearFilters = () => {
    setRecentStepFilters({
      dateRange: 'today',
      actionType: 'all'
    });
  };

  if (filteredRecentStepUpdates.length === 0 && !isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Step Updates
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="w-3 h-3 mr-1" />
            Clear Filters
          </Button>
        </div>
        <div className="text-center text-gray-500 text-sm">No updates found for selected filters</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Step Updates
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <X className="w-3 h-3 mr-1" />
          Clear Filters
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Date Range Filter */}
        <Select value={recentStepFilters.dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Type Filter */}
        <Select 
          value={recentStepFilters.actionType} 
          onValueChange={(value) => setRecentStepFilters(prev => ({ ...prev, actionType: value as any }))}
        >
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="reopened">Reopened</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {recentStepFilters.dateRange === 'custom' && (
          <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={recentStepFilters.customStartDate || ''}
                    onChange={(e) => setRecentStepFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={recentStepFilters.customEndDate || ''}
                    onChange={(e) => setRecentStepFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (recentStepFilters.customStartDate && recentStepFilters.customEndDate) {
                        handleCustomDateChange(recentStepFilters.customStartDate, recentStepFilters.customEndDate);
                      }
                    }}
                    disabled={!recentStepFilters.customStartDate || !recentStepFilters.customEndDate}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomDatePicker(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto seamless-scroll">
        {filteredRecentStepUpdates.map((update) => (
          <div
            key={update.id}
            className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getActionIcon(update.action, update.is_completed)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getActionColor(update.action, update.is_completed)}`}
                >
                  {getActionText(update.action, update.is_completed)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(update.updated_at)}
                </span>
              </div>
              
              <div className="text-sm font-medium text-gray-900 truncate">
                {update.step_title}
              </div>
              
              <div className="text-xs text-gray-500 truncate">
                from "{update.task_title}"
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentUpdateSteps;
