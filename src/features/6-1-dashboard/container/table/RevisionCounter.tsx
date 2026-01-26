
import React from 'react';
import { Button } from '@/features/ui/button';
import { RefreshCw } from 'lucide-react';

interface RevisionCounterProps {
  count: number;
  onReset: () => void;
  showResetButton?: boolean;
  isSelected?: boolean;
}

export const RevisionCounter: React.FC<RevisionCounterProps> = ({ count, onReset, showResetButton = true, isSelected = false }) => {
  return (
    <div className={`flex items-center justify-center gap-1 h-8 px-2 border border-gray-200 ${isSelected ? 'bg-blue-500' : ''}`}>
      <span className={`text-xs ${isSelected ? 'text-white' : ''}`}>{count}</span>
      {showResetButton && (
        <Button size="sm" variant="ghost" onClick={onReset} className={`h-4 w-4 p-0 ${isSelected ? 'text-white hover:text-white' : ''}`}>
          <RefreshCw className={`h-3 w-3 ${isSelected ? 'text-white' : ''}`} />
        </Button>
      )}
    </div>
  );
};
