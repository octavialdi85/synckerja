import { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/features/ui/button';

interface OverviewFooterProps {
  totalMetrics: number;
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const OverviewFooter = memo(({ 
  totalMetrics, 
  lastUpdated, 
  onRefresh, 
  isRefreshing 
}: OverviewFooterProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Total Metrics: {totalMetrics}</span>
          <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-6 px-2 text-xs -my-1"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
});

OverviewFooter.displayName = 'OverviewFooter';

