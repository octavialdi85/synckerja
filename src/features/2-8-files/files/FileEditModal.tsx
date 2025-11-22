
import React from 'react';
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
import { Edit, AlertCircle } from 'lucide-react';
import { CompanyFile, FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fileUploadSchema, FileUploadData } from '@/features/2-8-dashboard/utils/fileValidation';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';

interface FileEditModalProps {
  file: CompanyFile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, metadata: any) => Promise<void>;
  isUpdating: boolean;
}

export const FileEditModal = ({ 
  file, 
  isOpen, 
  onClose, 
  onUpdate, 
  isUpdating 
}: FileEditModalProps) => {
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();
  const { data: employee } = useCurrentEmployee();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<FileUploadData>({
    resolver: zodResolver(fileUploadSchema)
  });

  const watchedVisibility = watch('visibility');

  React.useEffect(() => {
    if (file && isOpen) {
      reset({
        file_name: file.file_name,
        file_category: file.file_category,
        visibility: file.visibility,
        description: file.description || '',
        expires_at: file.expires_at ? new Date(file.expires_at).toISOString().split('T')[0] : ''
      });
    }
  }, [file, isOpen, reset]);

  const onSubmit = async (data: FileUploadData) => {
    if (!file || !organizationId || !user) return;

    try {
      // Prepare update data
      const updateData: any = {
        file_name: data.file_name,
        file_category: data.file_category,
        visibility: data.visibility,
        description: data.description,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      // Handle employee_id based on visibility change
      if (data.visibility === 'privat') {
        // If changing to private, get employee_id if user is an employee
        if (employee) {
          updateData.employee_id = employee.id;
        } else {
          // User is not an employee (e.g., owner/guest) - set employee_id to null
          updateData.employee_id = null;
        }
      } else if (data.visibility === 'internal') {
        // If changing to internal, set employee_id to null (internal files belong to organization)
        updateData.employee_id = null;
      }

      await onUpdate(file.id, updateData);
      onClose();
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Edit File</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Update file information and metadata
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div 
            className="flex-1 overflow-y-auto px-6 py-6" 
            style={{ 
              scrollbarWidth: 'thin',
              scrollBehavior: 'smooth',
              scrollbarColor: '#d1d5db transparent'
            }}
          >
            <div className="space-y-6">
              {/* File Information Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="file_name" className="text-sm font-medium text-foreground">
                      File Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="file_name"
                      {...register('file_name')}
                      placeholder="Enter file name"
                      className={errors.file_name ? 'border-red-500' : ''}
                    />
                    {errors.file_name && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.file_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="file_category" className="text-sm font-medium text-foreground">
                      Category
                    </label>
                    <Select
                      value={watch('file_category')}
                      onValueChange={(value) => setValue('file_category', value as any)}
                    >
                      <SelectTrigger id="file_category" className={errors.file_category ? 'border-red-500' : ''}>
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
                    {errors.file_category && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.file_category.message}
                      </p>
                    )}
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
                    value={watch('visibility')}
                    onValueChange={(value) => setValue('visibility', value as any)}
                  >
                    <SelectTrigger id="visibility" className={errors.visibility ? 'border-red-500' : ''}>
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
                  {errors.visibility && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.visibility.message}
                    </p>
                  )}
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
                    {...register('description')}
                    placeholder="Enter description"
                    className="min-h-[100px] resize-none"
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Expiry Date Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="expires_at" className="text-sm font-medium text-foreground">
                    Expiry Date <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </label>
                  <Input
                    id="expires_at"
                    type="date"
                    {...register('expires_at')}
                  />
                  {errors.expires_at && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.expires_at.message}
                    </p>
                  )}
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
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                {isUpdating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Updating...
                  </>
                ) : (
                  'Update File'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
