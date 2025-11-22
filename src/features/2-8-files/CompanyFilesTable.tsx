import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
} from '@/features/ui/table';
import { useCompanyFiles } from './useCompanyFiles';
import { FilePreviewModal } from './files/FilePreviewModal';
import { FileEditModal } from './files/FileEditModal';
import { FileDeleteDialog } from './files/FileDeleteDialog';
import { CompanyFile } from '@/features/2-8-dashboard/utils/fileTypes';
import { CompanyFilesTableHeader } from './files-table/CompanyFilesTableHeader';
import { FileRow } from './files-table/FileRow';
import { CompanyFilesEmptyState } from './files-table/CompanyFilesEmptyState';

interface CompanyFilesTableProps {
  onUploadFile?: () => void;
}

export const CompanyFilesTable = ({ onUploadFile }: CompanyFilesTableProps) => {
  const { files, isLoading, deleteFile, updateFile, downloadFile, isDeleting, isUpdating } = useCompanyFiles();
  const [previewFile, setPreviewFile] = useState<CompanyFile | null>(null);
  const [editFile, setEditFile] = useState<CompanyFile | null>(null);
  const [deleteFile_, setDeleteFile] = useState<CompanyFile | null>(null);

  const handleViewDetails = useCallback((file: CompanyFile) => {
    setPreviewFile(file);
  }, []);

  const handleEditFile = useCallback((file: CompanyFile) => {
    setEditFile(file);
  }, []);

  const handleDeleteFile = useCallback((file: CompanyFile) => {
    setDeleteFile(file);
  }, []);

  const handleDownload = useCallback((file: CompanyFile) => {
    downloadFile(file);
  }, [downloadFile]);

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

  const hasFiles = files.length > 0;

  if (isLoading || !hasFiles) {
    return <CompanyFilesEmptyState isLoading={isLoading} hasFiles={hasFiles} onUploadFile={onUploadFile} />;
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <CompanyFilesTableHeader />
          <TableBody>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onViewDetails={handleViewDetails}
                onEditFile={handleEditFile}
                onDeleteFile={handleDeleteFile}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
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
