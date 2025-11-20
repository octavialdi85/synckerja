
import React from 'react';
import { Badge } from '@/features/ui/badge';
import { Info, Wrench } from 'lucide-react';
import { 
  getStatusBadgeColor, 
  getConditionBadgeColor, 
  formatAssetStatus, 
  formatAssetCondition 
} from './AssetStatusUtils';

interface AssetStatusConditionProps {
  status: string;
  condition: string;
}

export const AssetStatusCondition = ({ status, condition }: AssetStatusConditionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 flex items-center">
          <Info className="h-3 w-3 mr-1" />
          Status
        </label>
        <Badge className={getStatusBadgeColor(status)} variant="secondary">
          {formatAssetStatus(status)}
        </Badge>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 flex items-center">
          <Wrench className="h-3 w-3 mr-1" />
          Condition
        </label>
        <Badge className={getConditionBadgeColor(condition)} variant="secondary">
          {formatAssetCondition(condition)}
        </Badge>
      </div>
    </div>
  );
};
