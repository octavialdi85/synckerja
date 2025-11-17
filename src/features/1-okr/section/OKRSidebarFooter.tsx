import { Calendar } from 'lucide-react';

interface OKRSidebarFooterProps {
  totalCycles: number;
  activeCycleId?: string;
}

export const OKRSidebarFooter = ({ 
  totalCycles, 
  activeCycleId 
}: OKRSidebarFooterProps) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>Cycles: {totalCycles}</span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
};




























