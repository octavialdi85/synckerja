import React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface CompanyAssetsOverviewFooterProps {
  lastUpdated?: string | Date;
}

export const CompanyAssetsOverviewFooter: React.FC<CompanyAssetsOverviewFooterProps> = ({
  lastUpdated
}) => {
  const formatDate = (date?: string | Date) => {
    if (!date) return 'Never';
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last Updated
        </span>
        <span>{formatDate(lastUpdated)}</span>
      </div>
    </div>
  );
};

