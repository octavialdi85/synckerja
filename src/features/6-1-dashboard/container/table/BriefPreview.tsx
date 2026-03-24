
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface BriefPreviewProps {
  brief: string | null;
  onClick: () => void;
  isSelected?: boolean;
}

export const BriefPreview: React.FC<BriefPreviewProps> = ({ brief, onClick, isSelected = false }) => {
  const briefTrimmed = brief?.trim() ?? '';
  if (!briefTrimmed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-xs cursor-pointer h-8 w-full text-left px-2 border border-gray-200 ${isSelected ? 'text-white hover:text-white hover:bg-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
      >
        Click to add brief...
      </button>
    );
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasLink = urlRegex.test(briefTrimmed);
  
  if (hasLink) {
    const links = briefTrimmed.match(urlRegex) || [];
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
        className={`flex items-center gap-1 text-xs cursor-pointer h-8 w-full text-left px-2 border border-gray-200 ${isSelected ? 'text-white hover:text-white hover:bg-blue-600' : 'text-blue-600 hover:text-blue-800 hover:bg-gray-50'}`}
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
      className={`text-xs cursor-pointer h-8 w-full text-left px-2 border border-gray-200 ${isSelected ? 'text-white hover:text-white hover:bg-blue-600' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
    >
      <span className="truncate block">
        {briefTrimmed.length > 30 ? `${briefTrimmed.substring(0, 30)}...` : briefTrimmed}
      </span>
    </button>
  );
};
