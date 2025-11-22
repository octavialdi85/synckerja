import { Search, RefreshCw, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';

interface CompanyFilesFiltersProps {
  onUploadFile?: () => void;
}

export const CompanyFilesFilters = ({ onUploadFile }: CompanyFilesFiltersProps) => {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder="Search files..."
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* File Type Filter */}
        <Select>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>

        {/* File Size Filter */}
        <Select>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="File Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="small">Small (&lt; 1MB)</SelectItem>
            <SelectItem value="medium">Medium (1-10MB)</SelectItem>
            <SelectItem value="large">Large (10-100MB)</SelectItem>
            <SelectItem value="xlarge">Extra Large (&gt; 100MB)</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Date Uploaded" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        <button
          className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center"
          title="Clear all filters"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* Upload File Button */}
        {onUploadFile && (
          <Button
            onClick={onUploadFile}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        )}
      </div>
    </div>
  );
};
