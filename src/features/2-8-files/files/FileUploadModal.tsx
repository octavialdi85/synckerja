
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { Separator } from '@/features/ui/separator';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
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

      // Get employee_id if exists (for private files)
      let employeeId: string | null = null;
      if (formData.visibility === 'privat') {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        employeeId = employee?.id || null;
      }

      // Generate unique file path based on visibility
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.file_name}_${timestamp}_${randomString}.${fileExt}`;
      
      // Set file path based on visibility
      let filePath: string;
      let insertData: any = {
        organization_id: organizationId,
        file_name: formData.file_name,
        original_name: file.name,
        file_path: '',
        file_size: file.size,
        mime_type: file.type,
        file_category: formData.file_category,
        description: formData.description,
        visibility: formData.visibility,
        owner_id: user.id,
        owner_name: profile?.full_name || user.email || 'Unknown'
      };

      if (formData.visibility === 'privat') {
        // For private files: use user_id or employee_id
        const identifierId = employeeId || user.id;
        filePath = `${organizationId}/private/${identifierId}/${fileName}`;
        insertData.file_path = filePath;
        // Optionally store employee_id if available
        if (employeeId) {
          insertData.employee_id = employeeId;
        }
      } else {
        // For internal files: use organization_id
        filePath = `${organizationId}/${fileName}`;
        insertData.file_path = filePath;
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('company_files')
        .insert(insertData);

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
      <DialogContent className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Upload File</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Upload and manage company files and documents
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto px-6 py-6" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          <div className="space-y-6">
            {/* File Selection Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="file-upload" className="text-sm font-medium text-foreground">
                  Select File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                  disabled={uploading}
                />
                {!file ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                    className="w-full h-24 border-2 border-dashed border-input hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {uploading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload file or drag and drop
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PDF, DOC, XLS, PPT, Images up to 100MB
                          </span>
                        </>
                      )}
                    </div>
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* File Information Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="file_name" className="text-sm font-medium text-foreground">
                    File Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="file_name"
                    value={formData.file_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, file_name: e.target.value }))}
                    placeholder="Enter file name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="file_category" className="text-sm font-medium text-foreground">
                    Category
                  </label>
                  <Select
                    value={formData.file_category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, file_category: value as any }))}
                  >
                    <SelectTrigger id="file_category">
                      <SelectValue placeholder="Select category" />
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
              </div>
            </div>

            <Separator />

            {/* Visibility Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="visibility" className="text-sm font-medium text-foreground">
                  Visibility
                </label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value as any }))}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Select visibility" />
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
            </div>

            <Separator />

            {/* Description Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30">
          <div className="flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !formData.file_name || uploading}
              className="min-w-[120px]"
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Uploading...
                </>
              ) : (
                'Upload File'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
