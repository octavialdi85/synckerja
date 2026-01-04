import { Search, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import type { EmployeeFilters as FilterType } from '../utils/employeeUtils';

interface EmployeeFiltersProps {
  filters: FilterType;
  departments: string[];
  positions: string[];
  onFilterChange: (key: keyof FilterType, value: string) => void;
  onClearFilters: () => void;
}

export const EmployeeFilters = ({
  filters,
  departments,
  positions,
  onFilterChange,
  onClearFilters
}: EmployeeFiltersProps) => {
  const hasActiveFilters = 
    filters.search ||
    filters.department !== 'all' ||
    filters.position !== 'all' ||
    filters.status !== 'all' ||
    filters.employmentType !== 'all' ||
    filters.timePeriod !== 'all';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder="Search employees..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Department Filter */}
        <Select
          value={filters.department || 'all'}
          onValueChange={(value) => onFilterChange('department', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept.toLowerCase().trim()}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Position Filter */}
        <Select
          value={filters.position || 'all'}
          onValueChange={(value) => onFilterChange('position', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(pos => (
              <SelectItem key={pos} value={pos.toLowerCase().trim()}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending-removal">Pending Removal</SelectItem>
            <SelectItem value="on-leave">On Leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        {/* Employment Type Filter */}
        <Select
          value={filters.employmentType || 'all'}
          onValueChange={(value) => onFilterChange('employmentType', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Employment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full-time">Full Time</SelectItem>
            <SelectItem value="part-time">Part Time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
          </SelectContent>
        </Select>

        {/* Time Filter */}
        <Select
          value={filters.timePeriod || 'all'}
          onValueChange={(value) => onFilterChange('timePeriod', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="last_6_months">Last 6 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        <button
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className={`h-9 px-3 rounded-md transition-colors border border-gray-300 flex items-center justify-center ${
            hasActiveFilters 
              ? 'hover:bg-gray-100 cursor-pointer' 
              : 'opacity-50 cursor-not-allowed'
          }`}
          title="Clear all filters"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
};
