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
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div>
          Total Days: <span className="font-medium">{totalDays}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Active: <span className="font-medium text-green-600">{activeDays}</span></span>
          <span>Posts: <span className="font-medium text-blue-600">{totalPosts}</span></span>
        </div>
      </div>
    </div>
  );
};

