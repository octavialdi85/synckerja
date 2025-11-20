
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Button } from '@/features/ui/button';
import { Filter } from 'lucide-react';

interface AssetsFiltersProps {
  selectedCategory: string;
  selectedStatus: string;
  selectedCondition: string;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
  onConditionChange: (condition: string) => void;
}

export const AssetsFilters = ({
  selectedCategory,
  selectedStatus,
  selectedCondition,
  onCategoryChange,
  onStatusChange,
  onConditionChange,
}: AssetsFiltersProps) => {
  const handleClearFilters = () => {
    onCategoryChange('All Types');
    onStatusChange('All Statuses');
    onConditionChange('All Conditions');
  };

  return (
    <>
      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
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
        <SelectTrigger className="w-[130px] h-8 text-xs">
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
        <SelectTrigger className="w-[130px] h-8 text-xs">
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

      {/* Date Filter */}
      <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
        <Filter className="h-3 w-3 mr-1" />
        Date
      </Button>

      {/* Clear Button */}
      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={handleClearFilters}>
        Clear
      </Button>
    </>
  );
};
