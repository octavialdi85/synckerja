
import { useState } from 'react';
import { ResponsiveAttendanceTable } from './ResponsiveAttendanceTable';
import AttendanceCalendarView from './AttendanceCalendarView';
import { EnhancedAttendanceSidebar } from './EnhancedAttendanceSidebar';
import { useKeyboardNavigation } from '@/features/2-3-employee-attendance/hooks/useKeyboardNavigation';
import { ScrollArea } from '@/features/ui/scroll-area';
import { AttendanceFilters, createDefaultFilterState, type FilterState } from './AttendanceFilters';

interface EmployeeAttendanceTabProps {
  currentView: 'table' | 'calendar';
  onViewChange: (view: 'table' | 'calendar') => void;
}

const EmployeeAttendanceTab = ({ currentView, onViewChange }: EmployeeAttendanceTabProps) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState);

  // Mock data for demonstration
  const mockData = [
    { id: '1', employee: { full_name: 'John Doe' } },
    { id: '2', employee: { full_name: 'Jane Smith' } },
    { id: '3', employee: { full_name: 'Mike Johnson' } }
  ];

  // Move function declarations before useKeyboardNavigation
  const handleExport = () => {
    console.log('Exporting attendance data...');
    // Export implementation will be added with database integration
  };

  const handleBulkApprove = () => {
    console.log('Bulk approving selected records...');
    // Bulk approve implementation
  };

  // Keyboard navigation setup
  const {
    tableRef,
    getKeyboardShortcuts
  } = useKeyboardNavigation({
    data: mockData,
    selectedRows,
    expandedRows: [],
    onToggleSelection: (id: string) => {
      setSelectedRows(prev => 
        prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
      );
    },
    onToggleExpansion: () => {},
    onSelectAll: () => setSelectedRows(mockData.map(item => item.id)),
    onDeselectAll: () => setSelectedRows([]),
    onExport: handleExport,
    onBulkAction: handleBulkApprove
  });

  return (
    <div className="h-full max-h-[calc(100vh-120px)]">
      <div className="h-full overflow-y-auto seamless-scroll">
        <div className="grid grid-cols-12 gap-2 min-h-[calc(100vh-120px)]">
          {/* Main Content */}
          <div className="col-span-12 xl:col-span-9 flex flex-col min-h-0" ref={tableRef}>
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <AttendanceFilters
                filters={filters}
                setFilters={setFilters}
                currentView={currentView}
                onViewChange={onViewChange}
              />
              <div className="flex-1 min-h-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex-1 min-h-0 flex flex-col">
                    {currentView === 'table' ? (
                    <ResponsiveAttendanceTable 
                        searchTerm={filters.searchTerm}
                      status={filters.status}
                      dateRange={filters.dateRange}
                      />
                    ) : (
                    <AttendanceCalendarView
                      searchTerm={filters.searchTerm}
                      status={filters.status}
                      dateRange={filters.dateRange}
                    />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Side Panel */}
          <div className="col-span-12 xl:col-span-3 flex flex-col min-h-0">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
              <ScrollArea className="flex-1 px-6 py-4 seamless-scroll">
                <EnhancedAttendanceSidebar 
                  selectedRows={selectedRows}
                />
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceTab;
