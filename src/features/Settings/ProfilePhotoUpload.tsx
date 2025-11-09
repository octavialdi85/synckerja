import React, { useState, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/features/ui/avatar';
import { Button } from '@/features/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/1-login/contexts/AuthContext';
import { toast } from 'sonner';
import { getPhotoUrl, getInitials } from '@/features/2-1-employees/hooks/photoUtils';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  fullName: string;
  onPhotoUpdate: (photoUrl: string | null) => void;
}

export const ProfilePhotoUpload = ({ 
  currentPhotoUrl, 
  fullName, 
  onPhotoUpdate 
}: ProfilePhotoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t } = useAppTranslation();

  const uploadPhoto = useCallback(async (file: File) => {
    if (!user?.id) {
      toast.error(t('settings.profile.photo.toast.authError', 'User is not authenticated'));
      return;
    }

    setUploading(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(t('settings.profile.photo.toast.invalidType', 'Please choose an image file'));
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(t('settings.profile.photo.toast.fileTooLarge', 'Maximum file size is 5MB'));
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Delete existing photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.replace(
          'https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/employee-profiles/',
          ''
        );
        if (oldPath && oldPath !== currentPhotoUrl) {
          await supabase.storage
            .from('employee-profiles')
            .remove([oldPath]);
        }
      }

      // Upload new file
      const { data, error } = await supabase.storage
        .from('employee-profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      const publicUrl = getPhotoUrl(data.path);
      onPhotoUpdate(publicUrl);
      toast.success(t('settings.profile.photo.toast.uploadSuccess', 'Profile photo updated successfully'));

    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || t('settings.profile.photo.toast.uploadError', 'Failed to upload photo'));
    } finally {
      setUploading(false);
    }
  }, [user?.id, currentPhotoUrl, onPhotoUpdate, t]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
    // Reset input value
    event.target.value = '';
  }, [uploadPhoto]);

  const deletePhoto = useCallback(async () => {
    if (!user?.id || !currentPhotoUrl) {
      return;
    }

    setDeleting(true);
    try {
      // Extract filename from URL
      const path = currentPhotoUrl.replace(
        'https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/employee-profiles/',
        ''
      );
      
      if (path && path !== currentPhotoUrl) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('employee-profiles')
          .remove([path]);

        if (storageError) {
          throw storageError;
        }
      }

      onPhotoUpdate(null);
      toast.success(t('settings.profile.photo.toast.deleteSuccess', 'Profile photo removed successfully'));

    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || t('settings.profile.photo.toast.deleteError', 'Failed to delete photo'));
    } finally {
      setDeleting(false);
    }
  }, [user?.id, currentPhotoUrl, onPhotoUpdate, t]);

  const displayPhotoUrl = getPhotoUrl(currentPhotoUrl);

  return (
    <div className="relative inline-block">
      <div className="relative group">
        <Avatar className="w-32 h-32 cursor-pointer border-4 border-background shadow-lg">
          <AvatarImage 
            src={displayPhotoUrl || undefined} 
            alt={`${fullName} profile`}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay with hover effect */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-full flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2">
            {/* Upload Button */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || deleting}
              className="hidden"
              id="profile-photo-upload"
            />
            <label htmlFor="profile-photo-upload">
              <Button 
                variant="secondary" 
                size="sm"
                disabled={uploading || deleting}
                className="cursor-pointer h-10 w-10 p-0 bg-background/90 hover:bg-background shadow-lg"
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </span>
              </Button>
            </label>

            {/* Remove Button */}
            {displayPhotoUrl && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={deletePhoto}
                disabled={uploading || deleting}
                className="h-10 w-10 p-0 bg-background/90 hover:bg-background shadow-lg text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-sm text-muted-foreground">
          {t('settings.profile.photo.supportedFormats', 'JPG, PNG up to 5MB')}
        </p>
      </div>
    </div>
  );
};
