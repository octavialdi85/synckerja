
import React from 'react';
import { Tag } from 'lucide-react';

interface AssetIdentifiersProps {
  serialNumber?: string;
  assetTag?: string;
}

export const AssetIdentifiers = ({ serialNumber, assetTag }: AssetIdentifiersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 flex items-center">
          <Tag className="h-3 w-3 mr-1" />
          Serial Number
        </label>
        <p className="text-sm font-mono">{serialNumber || '-'}</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 flex items-center">
          <Tag className="h-3 w-3 mr-1" />
          Asset Tag
        </label>
        <p className="text-sm font-mono">{assetTag || '-'}</p>
      </div>
    </div>
  );
};
