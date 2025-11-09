import React from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Search, Filter, Plus, Trash2 } from 'lucide-react';

interface SocialMediaFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  selectedItems: string[];
  onAddContent: () => void;
  onDeleteSelected: () => void;
}

export const SocialMediaFilters = React.memo<SocialMediaFiltersProps>(({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  selectedItems,
  onAddContent,
  onDeleteSelected
}) => {
  
  // Prevent any form submission or page reload
  const handleAddContent = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddContent();
  };

  const handleDeleteSelected = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteSelected();
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls with Add Content Button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Search content, titles, briefs..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-9">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Ready To Post">Ready To Post</SelectItem>
            <SelectItem value="Content Need Review">Content Need Review</SelectItem>
            <SelectItem value="Content Revision">Content Revision</SelectItem>
            <SelectItem value="Prod Revision">Prod Revision</SelectItem>
            <SelectItem value="Prod Need Review">Prod Need Review</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          type="button"
          size="sm" 
          onClick={handleAddContent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
        {selectedItems.length > 0 && (
          <Button 
            type="button"
            size="sm" 
            variant="destructive" 
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedItems.length})
          </Button>
        )}
      </div>
    </div>
  );
});

SocialMediaFilters.displayName = 'SocialMediaFilters';
