
import { AttendanceTable } from './AttendanceTable';

interface ResponsiveAttendanceTableProps {
  searchTerm: string;
  status: string;
  dateRange?: { from?: Date; to?: Date };
}

export const ResponsiveAttendanceTable = ({
  searchTerm,
  status,
  dateRange
}: ResponsiveAttendanceTableProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain min-h-0 rounded-md">
          <AttendanceTable 
            searchTerm={searchTerm}
            status={status}
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  );
};
