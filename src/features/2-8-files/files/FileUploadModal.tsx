
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { Upload, X } from 'lucide-react';
import { FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';
import { validateFile } from '@/features/2-8-dashboard/utils/fileValidation';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { useQueryClient } from '@tanstack/react-query';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileUploadModal = ({ isOpen, onClose }: FileUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    file_name: '',
    file_category: 'dokumen' as keyof typeof FILE_CATEGORIES,
    visibility: 'internal' as keyof typeof FILE_VISIBILITY,
    description: ''
  });

  const { organizationId } = useCurrentOrg();
  const showToast = useShowToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (!validation.isValid) {
        showToast({
          title: 'Error',
          description: validation.error,
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setFormData(prev => ({
        ...prev,
        file_name: selectedFile.name.split('.')[0]
      }));
    }
  };

  const handleUpload = async () => {
    if (!file || !organizationId) return;

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Generate unique file path
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.file_name}_${timestamp}_${randomString}.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('company_files')
        .insert({
          organization_id: organizationId,
          file_name: formData.file_name,
          original_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          file_category: formData.file_category,
          description: formData.description,
          visibility: formData.visibility,
          owner_id: user.id,
          owner_name: profile?.full_name || user.email || 'Unknown'
        });

      if (dbError) throw dbError;

      // Refresh the files list
      queryClient.invalidateQueries({ queryKey: ['company-files'] });

      showToast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      // Reset form and close modal
      setFile(null);
      setFormData({
        file_name: '',
        file_category: 'dokumen',
        visibility: 'internal',
        description: ''
      });
      onClose();

    } catch (error: any) {
      console.error('Upload error:', error);
      showToast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFormData(prev => ({ ...prev, file_name: '' }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label>Select File</Label>
            {!file ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop file here or click to browse
                </p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="file_name">File Name</Label>
            <Input
              id="file_name"
              value={formData.file_name}
              onChange={(e) => setFormData(prev => ({ ...prev, file_name: e.target.value }))}
              placeholder="Enter file name"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.file_category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, file_category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILE_VISIBILITY).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !formData.file_name || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
