
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Asset Name</label>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Type</label>
        <p className="text-sm text-gray-900 capitalize">{formatAssetType(type)}</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Brand</label>
        <p className="text-sm text-gray-900">{brand || '-'}</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Model</label>
        <p className="text-sm text-gray-900">{model || '-'}</p>
      </div>
    </div>
  );
};
