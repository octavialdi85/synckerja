
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/features/ui/table';

export const CompanyFilesTableHeader = () => {
  return (
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold text-gray-900">File Name</TableHead>
        <TableHead className="font-semibold text-gray-900">Category</TableHead>
        <TableHead className="font-semibold text-gray-900">Size</TableHead>
        <TableHead className="font-semibold text-gray-900">Type</TableHead>
        <TableHead className="font-semibold text-gray-900">Visibility</TableHead>
        <TableHead className="font-semibold text-gray-900">Owner</TableHead>
        <TableHead className="font-semibold text-gray-900">Upload Date</TableHead>
        <TableHead className="font-semibold text-gray-900">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};


