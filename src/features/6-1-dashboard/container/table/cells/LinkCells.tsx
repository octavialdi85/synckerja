
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

  // Determine if done is false (no links exist)
  const isDone = links && links.length > 0;

  // Text color logic:
  // - If checkbox is checked AND PROD APPROVED = FALSE AND DONE = FALSE: use dark gray (not too black)
  // - If checkbox is checked (but other conditions not met): use white
  // - If NOT checked AND PROD APPROVED = TRUE AND DONE = TRUE: use dark gray/black for visibility
  // - Otherwise: default (black/gray)
  const getTextColorClass = (): string => {
    if (isSelected && !productionApproved && !isDone) {
      return 'text-gray-700'; // Dark gray, not too black
    }
    if (isSelected) {
      return 'text-white';
    }
    // When not selected but PROD APPROVED = TRUE and DONE = TRUE, ensure text is visible
    if (!isSelected && productionApproved && isDone) {
      return 'text-gray-900'; // Dark color for good visibility on white/light background
    }
    return 'text-gray-900'; // Default to dark color for visibility
  };

  const textColorClass = getTextColorClass();

  if (isDisabled) {
    // Apply same color logic for disabled state
    const disabledTextColor = isSelected && !productionApproved && !isDone 
      ? 'text-gray-700' 
      : isSelected 
        ? 'text-white' 
        : 'text-gray-500';
    
    // Change background when special condition is met to make dark gray text more visible
    const disabledBgColor = isSelected && !productionApproved && !isDone
      ? 'bg-white' // White background for better contrast with dark gray text
      : isSelected
        ? 'bg-blue-500' // Blue background when selected (normal case)
        : 'bg-gray-100'; // Default gray background
    
    return (
      <div className={`h-8 px-3 ${disabledBgColor} border border-gray-200 rounded text-xs flex items-center justify-center cursor-not-allowed ${disabledTextColor}`}>
        Production approval required
      </div>
    );
  }

  // Determine button background color based on selection and conditions
  const getButtonClassName = (): string => {
    const baseClass = 'h-8 w-full justify-center text-xs px-2 border border-gray-200';
    if (isSelected && !productionApproved && !isDone) {
      // When checkbox checked but PROD APPROVED = FALSE and DONE = FALSE, keep normal background
      return `${baseClass} hover:bg-gray-50`;
    }
    if (isSelected) {
      // Only add text-white to button if not in special condition (text color handled by span)
      return `${baseClass} hover:bg-blue-600`;
    }
    return `${baseClass} hover:bg-gray-50`;
  };

  return (
    <Button
      variant="ghost"
      className={getButtonClassName()}
      onClick={onSocialLinksClick}
    >
      <span className={`truncate text-center ${textColorClass}`}>
        {getPostLinksDisplayText()}
      </span>
    </Button>
  );
};
