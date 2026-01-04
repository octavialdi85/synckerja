
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/features/ui/table';

export const CompanyFilesTableHeader = () => {
  return (
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold text-gray-900 w-[280px] whitespace-nowrap">File Name</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[120px] whitespace-nowrap">Category</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[100px] whitespace-nowrap">Size</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[100px] whitespace-nowrap">Type</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[120px] whitespace-nowrap">Visibility</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[150px] whitespace-nowrap">Owner</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[120px] whitespace-nowrap">Upload Date</TableHead>
        <TableHead className="font-semibold text-gray-900 w-[100px] whitespace-nowrap">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};


