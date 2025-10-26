import { Calendar, CheckCircle2, FileText } from 'lucide-react';

interface CalendarGridFooterProps {
  totalDays: number;
  activeDays: number;
  totalPosts: number;
}

export const CalendarGridFooter = ({ 
  totalDays, 
  activeDays, 
  totalPosts 
}: CalendarGridFooterProps) => {
  const fillRate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  return (
    <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Total Days:</span>
            <span className="font-medium text-gray-900">{totalDays}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">Active Days:</span>
            <span className="font-medium text-green-600">{activeDays}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Total Posts:</span>
            <span className="font-medium text-blue-600">{totalPosts}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Fill Rate:</span>
          <span className="font-semibold text-gray-900">{fillRate}%</span>
        </div>
      </div>
    </div>
  );
};

