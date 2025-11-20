
import React from 'react';
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
import { CompanyFile, FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fileUploadSchema, FileUploadData } from '@/features/2-8-dashboard/utils/fileValidation';

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
    if (!file) return;

    try {
      await onUpdate(file.id, {
        file_name: data.file_name,
        file_category: data.file_category,
        visibility: data.visibility,
        description: data.description,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null
      });
      onClose();
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit File</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file_name">File Name</Label>
            <Input
              id="file_name"
              {...register('file_name')}
              placeholder="Enter file name"
            />
            {errors.file_name && (
              <p className="text-sm text-red-600">{errors.file_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_category">Category</Label>
            <Select
              value={watch('file_category')}
              onValueChange={(value) => setValue('file_category', value as any)}
            >
              <SelectTrigger>
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
              <p className="text-sm text-red-600">{errors.file_category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={watch('visibility')}
              onValueChange={(value) => setValue('visibility', value as any)}
            >
              <SelectTrigger>
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
              <p className="text-sm text-red-600">{errors.visibility.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter description (optional)"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
            <Input
              id="expires_at"
              type="date"
              {...register('expires_at')}
            />
            {errors.expires_at && (
              <p className="text-sm text-red-600">{errors.expires_at.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update File'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
