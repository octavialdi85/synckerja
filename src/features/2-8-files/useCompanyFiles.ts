
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { CompanyFile } from '@/features/2-8-dashboard/utils/fileTypes';

export const useCompanyFiles = () => {
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Fetch company files
  const {
    data: files = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['company-files', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('company_files')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching company files:', error);
        throw error;
      }

      return data as CompanyFile[];
    },
    enabled: !!organizationId
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('company-files')
        .remove([file.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('company_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  });

  // Update file metadata mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ id, metadata }: { id: string; metadata: any }) => {
      const { error } = await supabase
        .from('company_files')
        .update({
          ...metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-files'] });
      toast({
        title: 'Success',
        description: 'File updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update file',
        variant: 'destructive'
      });
    }
  });

  // Download file function
  const downloadFile = async (file: CompanyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('company-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive'
      });
    }
  };

  return {
    files,
    isLoading,
    error,
    deleteFile: deleteFileMutation.mutateAsync,
    updateFile: updateFileMutation.mutateAsync,
    downloadFile,
    isDeleting: deleteFileMutation.isPending,
    isUpdating: updateFileMutation.isPending
  };
};
