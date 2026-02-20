import { Search, Filter, ChevronDown, Calendar } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';

const MeetingFilters = () => {
  const { 
    filters, 
    setFilters, 
    meetingPoints 
  } = useMeetingNotes();
  
  const { data: employees = [] } = useAvailableEmployees();

  // Get unique request by names from meeting points
  const uniqueRequestBy = Array.from(
    new Set(
      meetingPoints
        .map(point => point.request_by)
        .filter(Boolean)
    )
  );

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, status: status === 'All Statuses' ? '' : status }));
  };

  const handleRequestByFilter = (requestBy: string) => {
    setFilters(prev => ({ ...prev, requestBy: requestBy === 'All Request By' ? '' : requestBy }));
  };

  const handleTimeFilter = (timeFilter: string) => {
    setFilters(prev => ({ ...prev, timeFilter: timeFilter === 'All Time' ? '' : timeFilter }));
  };

  // Get current date for display
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Date Display - Mobile friendly */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">{currentDate}</span>
      </div>

      {/* Search and Filters - Stack on mobile */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 w-full">
        {/* Search Input - Full width on mobile */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search discussion points..."
            className="pl-10 h-9 text-sm border-gray-200 w-full"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        {/* Filter Buttons - Single row, equal width */}
        <div className="flex items-center gap-1.5 flex-nowrap w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs md:text-sm border-gray-200 flex-1 min-w-0 justify-between gap-1.5 text-left px-2">
                <span className="truncate min-w-0">{filters.status || 'All Statuses'}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white z-50 min-w-[10rem] p-1">
              <DropdownMenuItem onClick={() => handleStatusFilter('All Statuses')} className="text-left px-3 py-2 text-sm cursor-pointer">
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter('Not Started')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter('On Going')} className="text-left px-3 py-2 text-sm cursor-pointer">
                On Going
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter('Completed')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter('Rejected')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Rejected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter('Presented')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Presented
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs md:text-sm border-gray-200 flex-1 min-w-0 justify-between gap-1.5 text-left px-2">
                <span className="truncate min-w-0">{filters.requestBy || 'All Request By'}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white z-50 min-w-[10rem] p-1">
              <DropdownMenuItem onClick={() => handleRequestByFilter('All Request By')} className="text-left px-3 py-2 text-sm cursor-pointer">
                All Request By
              </DropdownMenuItem>
              {uniqueRequestBy.map((name) => (
                <DropdownMenuItem key={name} onClick={() => handleRequestByFilter(name!)} className="text-left px-3 py-2 text-sm cursor-pointer min-w-0">
                  <span className="truncate block">{name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs md:text-sm border-gray-200 flex-1 min-w-0 justify-between gap-1.5 text-left px-2">
                <span className="truncate min-w-0">{filters.timeFilter || 'All Time'}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white z-50 min-w-[10rem] p-1">
              <DropdownMenuItem onClick={() => handleTimeFilter('All Time')} className="text-left px-3 py-2 text-sm cursor-pointer">
                All Time
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimeFilter('Today')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimeFilter('Yesterday')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Yesterday
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimeFilter('This Week')} className="text-left px-3 py-2 text-sm cursor-pointer">
                This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimeFilter('This Month')} className="text-left px-3 py-2 text-sm cursor-pointer">
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTimeFilter('Last Month')} className="text-left px-3 py-2 text-sm cursor-pointer">
                Last Month
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default MeetingFilters;

