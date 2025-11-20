
import React from 'react';

interface AssetsEmptyStateProps {
  isLoading: boolean;
  hasAssets: boolean;
}

export const AssetsEmptyState = ({ isLoading, hasAssets }: AssetsEmptyStateProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Loading assets...</p>
      </div>
    );
  }

  if (!hasAssets) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No assets found matching your criteria</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
      </div>
    );
  }

  return null;
};
