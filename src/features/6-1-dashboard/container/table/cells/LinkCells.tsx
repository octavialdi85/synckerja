
import React from 'react';
import { Button } from '@/features/ui/button';
import { ExternalLink, Link } from 'lucide-react';
import { useSocialMediaLinks } from '../../../hook/useSocialMediaLinks';

interface GoogleDriveLinkCellProps {
  googleDriveLink: string | null;
  isDisabled: boolean;
  onClick: () => void;
}

export const GoogleDriveLinkCell: React.FC<GoogleDriveLinkCellProps> = ({
  googleDriveLink,
  isDisabled,
  onClick
}) => {
  if (isDisabled) {
    return (
      <div className="h-8 px-3 bg-gray-100 border border-gray-200 rounded text-xs flex items-center justify-center text-gray-500 cursor-not-allowed">
        Approve first to add link
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className="h-8 w-full justify-center text-xs px-2 border border-gray-200 hover:bg-gray-50"
      onClick={onClick}
    >
      <span className="truncate">
        {googleDriveLink ? 'Google Drive Link Added' : 'Click to add Google Drive link...'}
      </span>
      {googleDriveLink && (
        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
      )}
    </Button>
  );
};

interface PostLinkCellProps {
  planId: string;
  isDisabled: boolean;
  onSocialLinksClick: () => void;
}

export const PostLinkCell: React.FC<PostLinkCellProps> = ({
  planId,
  isDisabled,
  onSocialLinksClick
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

  if (isDisabled) {
    return (
      <div className="h-8 px-3 bg-gray-100 border border-gray-200 rounded text-xs flex items-center justify-center text-gray-500 cursor-not-allowed">
        Production approval required
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className="h-8 w-full justify-start text-xs px-2 border border-gray-200 hover:bg-gray-50"
      onClick={onSocialLinksClick}
    >
      <span className="truncate">
        {getPostLinksDisplayText()}
      </span>
    </Button>
  );
};
