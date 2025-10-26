import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { AddReprimandDialog } from './AddReprimandDialog';

interface ReprimandFiltersType {
  search: string;
  department: string;
  status: string;
  severity: string;
  type: string;
  timePeriod: string;
}

interface ReprimandManagementFiltersProps {
  filters: ReprimandFiltersType;
  updateFilter: (key: keyof ReprimandFiltersType, value: string) => void;
  getFilterOptions: () => {
    departments: string[];
    statuses: string[];
    severities: string[];
    types: string[];
  };
  clearFilters: () => void;
}

function ReprimandManagementFilters({ 
  filters, 
  updateFilter, 
  getFilterOptions, 
  clearFilters 
}: ReprimandManagementFiltersProps) {
  const { departments, statuses, severities, types } = getFilterOptions();

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search reprimands..."
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Department Filter */}
        <Select value={filters.department} onValueChange={(value) => updateFilter('department', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Severity Filter */}
        <Select value={filters.severity} onValueChange={(value) => updateFilter('severity', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {severities.map((severity) => (
              <SelectItem key={severity} value={severity}>{severity}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time Filter */}
        <Select value={filters.timePeriod} onValueChange={(value) => updateFilter('timePeriod', value)}>
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
          onClick={clearFilters}
          className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center"
          title="Clear all filters"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* Add Reprimand Button */}
        <div className="flex-shrink-0">
          <AddReprimandDialog />
        </div>
      </div>
    </div>
  );
}

export default ReprimandManagementFilters;
