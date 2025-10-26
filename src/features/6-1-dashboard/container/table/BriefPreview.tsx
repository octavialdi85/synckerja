
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface BriefPreviewProps {
  brief: string | null;
  onClick: () => void;
}

export const BriefPreview: React.FC<BriefPreviewProps> = ({ brief, onClick }) => {
  if (!brief) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer h-8 w-full text-left"
      >
        Click to add brief...
      </button>
    );
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasLink = urlRegex.test(brief);
  
  if (hasLink) {
    const links = brief.match(urlRegex) || [];
    const firstLink = links[0];
    let linkType = '';
    if (firstLink.includes('docs.google.com')) {
      linkType = 'Google Docs';
    } else if (firstLink.includes('drive.google.com')) {
      linkType = 'Google Drive';
    } else if (firstLink.includes('youtube.com') || firstLink.includes('youtu.be')) {
      linkType = 'YouTube';
    } else {
      linkType = 'Link';
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer h-8 w-full text-left"
      >
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{linkType} detected</span>
      </button>
    );
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer h-8 w-full text-left"
    >
      <span className="truncate block">
        {brief.length > 30 ? `${brief.substring(0, 30)}...` : brief}
      </span>
    </button>
  );
};
