import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/features/ui/button';

const indonesianMonths = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth
}) => {
  return (
    <div className="space-y-3">
      {/* Main Header */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Content Planning Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-medium min-w-[200px] text-center">
            {indonesianMonths[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <Button variant="outline" size="sm" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-700">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-gray-700">Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-gray-700">Revision</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-gray-700">Overdue</span>
        </div>
      </div>
    </div>
  );
};
