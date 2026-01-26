
import React from 'react';
import { Button } from '@/features/ui/button';
import { ExternalLink, Link } from 'lucide-react';
import { useSocialMediaLinks } from '../../../hook/useSocialMediaLinks';

interface GoogleDriveLinkCellProps {
  googleDriveLink: string | null;
  isDisabled: boolean;
  onClick: () => void;
  isSelected?: boolean;
}

export const GoogleDriveLinkCell: React.FC<GoogleDriveLinkCellProps> = ({
  googleDriveLink,
  isDisabled,
  onClick,
  isSelected = false
}) => {
  if (isDisabled) {
    return (
      <div className={`h-8 px-3 bg-gray-100 border border-gray-200 rounded text-xs flex items-center justify-center cursor-not-allowed ${isSelected ? 'text-white' : 'text-gray-500'}`}>
        Approve first to add link
      </div>
    );
  }

  // Normalize: Treat both null and empty string as empty for consistent display
  // This ensures consistent placeholder regardless of whether value is null or ''
  const hasLink = googleDriveLink && googleDriveLink.trim().length > 0;

  return (
    <Button
      variant="ghost"
      className={`h-8 w-full justify-center text-xs px-2 border border-gray-200 ${isSelected ? 'hover:bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
      onClick={onClick}
    >
      <span className={`truncate ${isSelected ? 'text-white' : ''}`}>
        {hasLink ? 'Google Drive Link Added' : 'Click to add Google Drive link...'}
      </span>
      {hasLink && (
        <ExternalLink className={`h-3 w-3 ml-1 flex-shrink-0 ${isSelected ? 'text-white' : ''}`} />
      )}
    </Button>
  );
};

interface PostLinkCellProps {
  planId: string;
  isDisabled: boolean;
  onSocialLinksClick: () => void;
  isSelected?: boolean;
  productionApproved?: boolean;
}

export const PostLinkCell: React.FC<PostLinkCellProps> = ({
  planId,
  isDisabled,
  onSocialLinksClick,
  isSelected = false,
  productionApproved = false
}) => {
  const { links } = useSocialMediaLinks(planId);

  const getPostLinksDisplayText = (): string => {
    if (!links || links.length === 0) return 'Click to add social media links...';
    
    if (links.length === 1) {
      const link = links[0];
      return `${link.platform} link added`;
    }
    
    return `${links.length} social media links added`;
  };

  // Text color: white if production approved, otherwise default (black)
  const textColorClass = productionApproved ? 'text-white' : '';

  if (isDisabled) {
    return (
      <div className="h-8 px-3 bg-gray-100 border border-gray-200 rounded text-xs flex items-center justify-center cursor-not-allowed text-gray-500">
        Production approval required
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className={`h-8 w-full justify-start text-xs px-2 border border-gray-200 ${isSelected ? 'hover:bg-blue-600' : 'hover:bg-gray-50'} ${productionApproved ? 'text-white' : ''}`}
      onClick={onSocialLinksClick}
    >
      <span className={`truncate ${textColorClass}`}>
        {getPostLinksDisplayText()}
      </span>
    </Button>
  );
};
