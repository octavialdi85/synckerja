
import React from 'react';

interface AssetImageProps {
  imageUrl?: string;
  assetName: string;
}

export const AssetImage = ({ imageUrl, assetName }: AssetImageProps) => {
  if (!imageUrl) return null;

  return (
    <div className="flex justify-center mb-3">
      <img
        src={imageUrl}
        alt={assetName}
        className="max-w-xs max-h-32 object-cover rounded-lg border"
      />
    </div>
  );
};
