
import React, { useState } from 'react';
import { Search, Filter, Plus, Users, X } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Badge } from '@/features/ui/badge';
import EnhancedAddKOLModal from '../modals/EnhancedAddKOLModal';

interface KOLManagementFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    category: string;
    platform: string;
    status: string;
    performance: string;
  }) => void;
}

export const KOLManagementFilters = ({ onFiltersChange }: KOLManagementFiltersProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    platform: 'all',
    status: 'all',
    performance: 'all'
  });

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      category: 'all',
      platform: 'all',
      status: 'all',
      performance: 'all'
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category !== 'all') count++;
    if (filters.platform !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.performance !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3 mb-3 shadow-sm">
        {/* Header Section with Title and Add Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">KOL Management</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
              <Users className="w-4 h-4" />
              KOL List
            </Button>
            <Button 
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add KOL
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search KOLs..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-8 pr-3 py-2 text-xs border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="food">Food & Beverage</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="tech">Technology</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.platform} onValueChange={(value) => updateFilter('platform', value)}>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.performance} onValueChange={(value) => updateFilter('performance', value)}>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="high">High (5%+)</SelectItem>
              <SelectItem value="medium">Medium (2-5%)</SelectItem>
              <SelectItem value="low">Low (&lt;2%)</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Filter className="h-3 w-3 mr-1" />
            More Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs h-4">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-50"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {filters.search && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                Search: {filters.search}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('search', '')}
                />
              </Badge>
            )}
            {filters.category !== 'all' && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                Category: {filters.category}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('category', 'all')}
                />
              </Badge>
            )}
            {filters.platform !== 'all' && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                Platform: {filters.platform}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('platform', 'all')}
                />
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                Status: {filters.status}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('status', 'all')}
                />
              </Badge>
            )}
            {filters.performance !== 'all' && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                Performance: {filters.performance}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('performance', 'all')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Add KOL Modal */}
      <EnhancedAddKOLModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
      />
    </>
  );
};
