import { Search, RefreshCw, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';

interface AssetsFiltersProps {
  selectedCategory: string;
  selectedStatus: string;
  selectedCondition: string;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
  onConditionChange: (condition: string) => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onAddAsset?: () => void;
}

export const AssetsFilters = ({
  selectedCategory,
  selectedStatus,
  selectedCondition,
  onCategoryChange,
  onStatusChange,
  onConditionChange,
  searchTerm = '',
  onSearchChange,
  onRefresh,
  onAddAsset,
}: AssetsFiltersProps) => {
  const handleClearFilters = () => {
    onCategoryChange('All Types');
    onStatusChange('All Statuses');
    onConditionChange('All Conditions');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
            <Input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Types">All Types</SelectItem>
            <SelectItem value="Laptop">Laptop</SelectItem>
            <SelectItem value="Desktop">Desktop</SelectItem>
            <SelectItem value="Monitor">Monitor</SelectItem>
            <SelectItem value="Phone">Phone</SelectItem>
            <SelectItem value="Tablet">Tablet</SelectItem>
            <SelectItem value="Keyboard">Keyboard</SelectItem>
            <SelectItem value="Mouse">Mouse</SelectItem>
            <SelectItem value="Headset">Headset</SelectItem>
            <SelectItem value="Docking Station">Docking Station</SelectItem>
            <SelectItem value="Printer">Printer</SelectItem>
            <SelectItem value="Camera">Camera</SelectItem>
            <SelectItem value="Lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Statuses">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="In Use">In Use</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
            <SelectItem value="Lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>

        {/* Condition Filter */}
        <Select value={selectedCondition} onValueChange={onConditionChange}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Conditions">All Conditions</SelectItem>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
            <SelectItem value="Damaged">Damaged</SelectItem>
            <SelectItem value="Lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {(onRefresh || handleClearFilters) && (
          <button
            onClick={() => {
              handleClearFilters();
              if (onRefresh) onRefresh();
            }}
            className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center"
            title="Clear all filters"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        )}

        {/* Add Asset Button */}
        {onAddAsset && (
          <Button
            onClick={onAddAsset}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </Button>
        )}
      </div>
    </div>
  );
};
