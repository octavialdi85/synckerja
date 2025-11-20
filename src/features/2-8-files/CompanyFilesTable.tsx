
import { useState } from 'react';
import { formatFileSize, getFileExtension, FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { FileText, Image, Upload, Plus, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useCompanyFiles } from './useCompanyFiles';
import { FileUploadModal } from './files/FileUploadModal';
import { FilePreviewModal } from './files/FilePreviewModal';
import { FileEditModal } from './files/FileEditModal';
import { FileDeleteDialog } from './files/FileDeleteDialog';
import { CompanyFile } from '@/features/2-8-dashboard/utils/fileTypes';

export const CompanyFilesTable = () => {
  const { files, isLoading, deleteFile, updateFile, downloadFile, isDeleting, isUpdating } = useCompanyFiles();
  
  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CompanyFile | null>(null);
  const [editFile, setEditFile] = useState<CompanyFile | null>(null);
  const [deleteFile_, setDeleteFile] = useState<CompanyFile | null>(null);

  const getVisibilityColor = (visibility: keyof typeof FILE_VISIBILITY) => {
    switch (visibility) {
      case 'publik':
        return 'bg-green-100 text-green-800';
      case 'internal':
        return 'bg-blue-100 text-blue-800';
      case 'privat':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return Image;
    }
    return FileText;
  };

  const handleViewDetails = (file: CompanyFile) => {
    setPreviewFile(file);
  };

  const handleEdit = (file: CompanyFile) => {
    setEditFile(file);
  };

  const handleDelete = (file: CompanyFile) => {
    setDeleteFile(file);
  };

  const handleDownload = (file: CompanyFile) => {
    downloadFile(file);
  };

  const handleConfirmDelete = async () => {
    if (deleteFile_) {
      await deleteFile(deleteFile_.id);
      setDeleteFile(null);
    }
  };

  const handleUpdateFile = async (id: string, metadata: any) => {
    await updateFile({ id, metadata });
    setEditFile(null);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Company Files</h3>
            <p className="text-xs text-slate-500">Manage company documents and files</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Company Files</h3>
            <p className="text-xs text-slate-500">Manage company documents and files</p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">File Name</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Category</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Size</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Type</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Visibility</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Owner</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Upload Date</th>
                <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const FileIcon = getFileIcon(file.mime_type);
                
                return (
                  <tr key={file.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-slate-100">
                          <FileIcon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium leading-tight text-slate-900">{file.file_name}</p>
                          {file.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{file.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-600">{FILE_CATEGORIES[file.file_category]}</span>
                    </td>
                    <td className="p-3">
                      <p className="text-xs font-medium text-slate-900">{formatFileSize(file.file_size)}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {getFileExtension(file.file_name)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${getVisibilityColor(file.visibility)}`}>
                        {FILE_VISIBILITY[file.visibility]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-600">{file.owner_name}</span>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-900">
                          {format(new Date(file.created_at), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(file.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(file)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(file)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(file)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {files.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 mb-2">No files found</p>
              <p className="text-xs text-slate-400 mb-4">Upload your first file to get started</p>
              <Button onClick={() => setUploadModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      <FileEditModal
        file={editFile}
        isOpen={!!editFile}
        onClose={() => setEditFile(null)}
        onUpdate={handleUpdateFile}
        isUpdating={isUpdating}
      />

      <FileDeleteDialog
        file={deleteFile_}
        isOpen={!!deleteFile_}
        onClose={() => setDeleteFile(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
