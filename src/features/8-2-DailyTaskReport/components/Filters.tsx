import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useDailyTaskReport } from '../context/ReportContext';

export const Filters = () => {
  const { filters, updateFilter, options } = useDailyTaskReport() as any;
  const handleClear = () => {
    updateFilter('search', '');
    updateFilter('status', 'all');
    updateFilter('timePeriod', 'all');
    updateFilter('customStart', '');
    updateFilter('customEnd', '');
    updateFilter('pic', 'all');
    updateFilter('task', 'all');
    updateFilter('step', 'all');
    updateFilter('subStep', 'all');
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md">
      <div className="flex flex-wrap gap-1 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[150px]">
        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search employee, task, step..."
          className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Status */}
      <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="w-full sm:w-32 lg:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="ontime">On-Time</SelectItem>
          <SelectItem value="late">Late</SelectItem>
        </SelectContent>
      </Select>

      {/* Time Period */}
      <Select value={filters.timePeriod} onValueChange={(v) => updateFilter('timePeriod', v)}>
        <SelectTrigger className="w-full sm:w-32 lg:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="Time Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Range (visible only when selected) */}
      {filters.timePeriod === 'custom' && (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filters.customStart || ''}
            onChange={(e) => updateFilter('customStart', e.target.value)}
            className="h-9"
          />
          <span className="text-xs text-gray-500">to</span>
          <Input
            type="date"
            value={filters.customEnd || ''}
            onChange={(e) => updateFilter('customEnd', e.target.value)}
            className="h-9"
          />
        </div>
      )}

      {/* PIC */}
      <Select value={filters.pic || 'all'} onValueChange={(v) => updateFilter('pic', v)}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="PIC" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PIC</SelectItem>
          {options.pics.map((n: string) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Task */}
      <Select value={filters.task || 'all'} onValueChange={(v) => {
        updateFilter('task', v);
        // reset child filters when parent changes
        updateFilter('step', 'all');
        updateFilter('subStep', 'all');
      }}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="Task" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tasks</SelectItem>
          {options.tasks.map((t: string) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Step */}
      <Select value={filters.step || 'all'} onValueChange={(v) => {
        updateFilter('step', v);
        // reset sub child when step changes
        updateFilter('subStep', 'all');
      }}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="Step" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Steps</SelectItem>
          {options.steps.map((s: string) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sub-step */}
      <Select value={filters.subStep || 'all'} onValueChange={(v) => updateFilter('subStep', v)}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm text-gray-700 text-left">
          <SelectValue placeholder="Sub-step" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sub-steps</SelectItem>
          {options.subSteps.map((s: string) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Clear Filters */}
      <button
        onClick={handleClear}
        className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center ml-auto"
        title="Clear filters"
      >
        <RefreshCw className="w-4 h-4 text-gray-500" />
      </button>
      </div>
    </div>
  );
};


