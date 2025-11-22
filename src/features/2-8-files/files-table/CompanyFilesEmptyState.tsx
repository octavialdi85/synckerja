
import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/features/ui/button';

interface CompanyFilesEmptyStateProps {
  isLoading: boolean;
  hasFiles: boolean;
  onUploadFile?: () => void;
}

export const CompanyFilesEmptyState = ({ isLoading, hasFiles, onUploadFile }: CompanyFilesEmptyStateProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Loading files...</p>
      </div>
    );
  }

  if (!hasFiles) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No files found matching your criteria</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
        {onUploadFile && (
          <Button 
            onClick={onUploadFile} 
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Upload File
          </Button>
        )}
      </div>
    );
  }

  return null;
};


