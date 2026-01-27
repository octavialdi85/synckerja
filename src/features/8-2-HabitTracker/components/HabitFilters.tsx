import React from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Card, CardContent } from '@/features/ui/card';
import { Search } from 'lucide-react';

export const HabitFilters = () => {
  const { filters, updateFilter } = useHabitTracker();

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search habits..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={filters.frequency}
            onValueChange={(value) => updateFilter('frequency', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
