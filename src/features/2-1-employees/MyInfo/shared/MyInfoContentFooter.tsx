import { Calendar, Info } from 'lucide-react';

interface MyInfoContentFooterProps {
  section: string;
  lastUpdated?: string;
}

export const MyInfoContentFooter = ({ 
  section, 
  lastUpdated 
}: MyInfoContentFooterProps) => {
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    day: 'numeric',
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Section: {section}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {lastUpdated || currentDate}
        </span>
      </div>
    </div>
  );
};

