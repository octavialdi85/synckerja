
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { X, Download } from 'lucide-react';
import { CompanyFile, isImageFile, isPdfFile } from '@/features/2-8-dashboard/utils/fileTypes';
import { supabase } from '@/integrations/supabase/client';
import { useShowToast } from '@/features/share/hooks/useShowToast';

interface FilePreviewModalProps {
  file: CompanyFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: CompanyFile) => void;
}

export const FilePreviewModal = ({ file, isOpen, onClose, onDownload }: FilePreviewModalProps) => {
  const showToast = useShowToast();
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (file && isOpen) {
      generatePreviewUrl();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, isOpen]);

  const generatePreviewUrl = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('company-files')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
    } catch (error: any) {
      console.error('Error generating preview URL:', error);
      showToast({
        title: 'Error',
        description: 'Failed to generate preview URL',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    if (!file || !previewUrl) return null;

    if (isImageFile(file.mime_type)) {
      return (
        <img
          src={previewUrl}
          alt={file.file_name}
          className="max-w-full max-h-96 object-contain mx-auto"
        />
      );
    }

    if (isPdfFile(file.mime_type)) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-96 border-0"
          title={file.file_name}
        />
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Preview not available for this file type</p>
        <Button 
          onClick={() => file && onDownload(file)} 
          className="mt-4"
        >
          <Download className="h-4 w-4 mr-2" />
          Download to View
        </Button>
      </div>
    );
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{file.file_name}</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(file)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderPreview()
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Original Name:</strong> {file.original_name}</p>
          <p><strong>Size:</strong> {(file.file_size / 1024).toFixed(1)} KB</p>
          <p><strong>Type:</strong> {file.mime_type}</p>
          <p><strong>Category:</strong> {file.file_category}</p>
          <p><strong>Visibility:</strong> {file.visibility}</p>
          <p><strong>Uploaded:</strong> {new Date(file.created_at).toLocaleDateString()}</p>
          <p><strong>Owner:</strong> {file.owner_name}</p>
          {file.description && <p><strong>Description:</strong> {file.description}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
