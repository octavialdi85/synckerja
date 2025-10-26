import React, { useRef, useState } from 'react';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Upload, X, File } from 'lucide-react';

interface FileUploadProps {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string | null) => void;
  accept?: string;
  required?: boolean;
  maxSize?: number; // in bytes
}

export const FileUpload: React.FC<FileUploadProps> = ({
  id,
  label,
  value,
  onChange,
  accept = "*",
  required = false,
  maxSize = 5 * 1024 * 1024 // 5MB default
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert file to base64 for storage
      const base64 = await convertToBase64(file);
      onChange(base64);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing file');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    onChange(null);
    setError(null);
  };

  const getFileName = () => {
    if (!value) return null;
    // Extract filename from base64 or return a generic name
    return 'Uploaded file';
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          onChange={handleFileSelect}
          className="hidden"
          accept={accept}
        />
        
        {!value ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-gray-400"
          >
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
            </div>
          </Button>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{getFileName()}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};








