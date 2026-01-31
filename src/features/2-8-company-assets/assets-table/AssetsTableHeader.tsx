import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const AssetsTableHeader = () => {
  const { t } = useAppTranslation();
  return (
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold text-gray-900">Asset</TableHead>
        <TableHead className="font-semibold text-gray-900">Type</TableHead>
        <TableHead className="font-semibold text-gray-900">Serial Number</TableHead>
        <TableHead className="font-semibold text-gray-900">Brand/Model</TableHead>
        <TableHead className="font-semibold text-gray-900">Status</TableHead>
        <TableHead className="font-semibold text-gray-900">{t('companyAssets.assignedTo', 'Held by')}</TableHead>
        <TableHead className="font-semibold text-gray-900">{t('companyAssets.assignedDepartment', "Holder's department")}</TableHead>
        <TableHead className="font-semibold text-gray-900">Condition</TableHead>
        <TableHead className="font-semibold text-gray-900">{t('companyAssets.requestedBy', 'Requested by')}</TableHead>
        <TableHead className="font-semibold text-gray-900">{t('companyAssets.department', 'Department')}</TableHead>
        <TableHead className="font-semibold text-gray-900">Receipt</TableHead>
        <TableHead className="font-semibold text-gray-900">Purchase Price</TableHead>
        <TableHead className="font-semibold text-gray-900">Purchase Date</TableHead>
        <TableHead className="font-semibold text-gray-900">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};
