import React from 'react';
import { MasterDataToolbar } from './master-data/MasterDataToolbar';
import { SocialMediaErrorBoundary } from '../hook/ErrorBoundary';

interface TableFooterProps {
  onContentTypeDataChange: () => void;
  onServiceDataChange: () => void;
  onContentPillarDataChange: () => void;
  onSocialMediaNameDataChange: () => void;
  services: any[];
}

export const TableFooter: React.FC<TableFooterProps> = ({
  onContentTypeDataChange,
  onServiceDataChange,
  onContentPillarDataChange,
  onSocialMediaNameDataChange,
  services
}) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <SocialMediaErrorBoundary>
        <MasterDataToolbar 
          onContentTypeDataChange={onContentTypeDataChange} 
          onServiceDataChange={onServiceDataChange} 
          onContentPillarDataChange={onContentPillarDataChange} 
          onSocialMediaNameDataChange={onSocialMediaNameDataChange} 
          services={services} 
        />
      </SocialMediaErrorBoundary>
    </div>
  );
};
