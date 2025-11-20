
import React from 'react';
import { formatAssetType } from './AssetStatusUtils';

interface AssetBasicInfoProps {
  name: string;
  type: string;
  brand?: string;
  model?: string;
}

export const AssetBasicInfo = ({ name, type, brand, model }: AssetBasicInfoProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Asset Name</label>
        <p className="text-sm font-semibold">{name}</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Type</label>
        <p className="text-sm capitalize">{formatAssetType(type)}</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Brand</label>
        <p className="text-sm">{brand || '-'}</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Model</label>
        <p className="text-sm">{model || '-'}</p>
      </div>
    </div>
  );
};
