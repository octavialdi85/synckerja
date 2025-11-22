
import React from 'react';
import { TableCell, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { format } from 'date-fns';
import { formatFileSize, getFileExtension, FILE_CATEGORIES, FILE_VISIBILITY } from '@/features/2-8-dashboard/utils/fileTypes';
import { FileText, Image } from 'lucide-react';
import { CompanyFile } from '@/features/2-8-dashboard/utils/fileTypes';

interface FileRowProps {
  file: CompanyFile;
  onViewDetails: (file: CompanyFile) => void;
  onEditFile: (file: CompanyFile) => void;
  onDeleteFile: (file: CompanyFile) => void;
}

export const FileRow = ({ file, onViewDetails, onEditFile, onDeleteFile }: FileRowProps) => {
  const getVisibilityColor = (visibility: keyof typeof FILE_VISIBILITY) => {
    switch (visibility) {
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

  const FileIcon = getFileIcon(file.mime_type);

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gray-100">
            <FileIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-tight text-gray-900">{file.file_name}</p>
            {file.description && (
              <p className="text-xs text-gray-500 line-clamp-1">{file.description}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{FILE_CATEGORIES[file.file_category]}</TableCell>
      <TableCell>{formatFileSize(file.file_size)}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {getFileExtension(file.file_name)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getVisibilityColor(file.visibility)} variant="secondary">
          {FILE_VISIBILITY[file.visibility]}
        </Badge>
      </TableCell>
      <TableCell>{file.owner_name}</TableCell>
      <TableCell>
        {format(new Date(file.created_at), 'dd/MM/yyyy')}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border shadow-lg">
            <DropdownMenuItem onClick={() => onViewDetails(file)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditFile(file)}>
              Edit File
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeleteFile(file)}
              className="text-red-600 focus:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

