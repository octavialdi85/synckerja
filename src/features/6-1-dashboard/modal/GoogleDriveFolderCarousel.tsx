
import React from 'react';
import { ExternalLink, FolderOpen } from 'lucide-react';
import { Button } from '@/features/ui/button';

interface GoogleDriveFolderCarouselProps {
  folderUrl: string;
}

const GoogleDriveFolderCarousel: React.FC<GoogleDriveFolderCarouselProps> = ({ folderUrl }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center p-8">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Google Drive Folder</h3>
        <p className="text-sm text-gray-600 mb-4">
          Google Drive folder preview is not available yet.
        </p>
        <a
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Google Drive
        </a>
      </div>
    </div>
  );
};

export default GoogleDriveFolderCarousel;
