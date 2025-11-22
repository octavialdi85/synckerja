
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { MoreHorizontal, Download, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { CompanyFile, formatFileSize, getFileExtension, FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';

interface FileTableProps {
  files: CompanyFile[];
  isLoading: boolean;
  onEdit: (file: CompanyFile) => void;
  onDelete: (file: CompanyFile) => void;
  onDownload: (file: CompanyFile) => void;
  onPreview: (file: CompanyFile) => void;
}

export const FileTable = ({ 
  files, 
  isLoading, 
  onEdit, 
  onDelete, 
  onDownload, 
  onPreview 
}: FileTableProps) => {
  const getVisibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case 'internal':
        return 'bg-blue-100 text-blue-800';
      case 'privat':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'dokumen':
        return 'bg-blue-100 text-blue-800';
      case 'gambar':
        return 'bg-purple-100 text-purple-800';
      case 'pdf':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No files found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-gray-900">File Name</TableHead>
            <TableHead className="font-semibold text-gray-900">Category</TableHead>
            <TableHead className="font-semibold text-gray-900">Size</TableHead>
            <TableHead className="font-semibold text-gray-900">Uploaded by</TableHead>
            <TableHead className="font-semibold text-gray-900">Visibility</TableHead>
            <TableHead className="font-semibold text-gray-900">Upload Date</TableHead>
            <TableHead className="font-semibold text-gray-900">Last Modified</TableHead>
            <TableHead className="font-semibold text-gray-900">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-800">
                        {getFileExtension(file.original_name)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.file_name}</p>
                    <p className="text-sm text-gray-500">{file.original_name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getCategoryBadgeColor(file.file_category)} variant="secondary">
                  {FILE_CATEGORIES[file.file_category]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatFileSize(file.file_size)}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {file.owner_name}
              </TableCell>
              <TableCell>
                <Badge className={getVisibilityBadgeColor(file.visibility)} variant="secondary">
                  {FILE_VISIBILITY[file.visibility]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm')}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {format(new Date(file.updated_at), 'dd/MM/yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border shadow-lg">
                    <DropdownMenuItem onClick={() => onPreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(file)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(file)}
                      className="text-red-600 focus:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
