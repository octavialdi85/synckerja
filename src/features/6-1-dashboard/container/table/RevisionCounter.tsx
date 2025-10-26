
import React from 'react';
import { Button } from '@/features/ui/button';
import { RefreshCw } from 'lucide-react';

interface RevisionCounterProps {
  count: number;
  onReset: () => void;
  showResetButton?: boolean;
}

export const RevisionCounter: React.FC<RevisionCounterProps> = ({ count, onReset, showResetButton = true }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-xs">{count}</span>
      {showResetButton && (
        <Button size="sm" variant="ghost" onClick={onReset} className="h-4 w-4 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
