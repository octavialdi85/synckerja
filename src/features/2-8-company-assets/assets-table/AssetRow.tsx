
import React from 'react';
import { TableCell, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { MoreHorizontal, Trash2, UserPlus, ArrowRightLeft, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { format } from 'date-fns';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface Asset {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  asset_tag: string;
  brand: string;
  model: string;
  status: string;
  condition: string;
  purchase_date: string;
  purchase_price: number;
  notes: string;
  image_url: string;
  created_at: string;
  purchase_request_id?: string | null;
  receipt_confirmed_at?: string | null;
  requester_name?: string | null;
  department_name?: string | null;
  assigned_to_employee_id?: string | null;
  assigned_at?: string | null;
  assigned_employee_name?: string | null;
  assigned_department_name?: string | null;
}

interface AssetRowProps {
  asset: Asset;
  onViewDetails: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onAssign?: (asset: Asset) => void;
  onHandover?: (asset: Asset) => void;
  onReturn?: (asset: Asset) => void;
  canManageAssignments?: boolean;
}

export const AssetRow = ({ asset, onViewDetails, onEditAsset, onDeleteAsset, onAssign, onHandover, onReturn, canManageAssignments }: AssetRowProps) => {
  const { t } = useAppTranslation();
  const fromPurchaseRequest = !!asset.purchase_request_id;
  const receiptConfirmed = !!asset.receipt_confirmed_at;
  const receiptStatusLabel = !fromPurchaseRequest ? '-' : receiptConfirmed ? t('companyAssets.receiptStatus.received', 'Received') : t('companyAssets.receiptStatus.pendingReceipt', 'Pending receipt');

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in-use':
        return 'bg-green-100 text-green-800';
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      case 'other':
      case 'lainnya':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-orange-100 text-orange-800';
      case 'damaged':
        return 'bg-red-100 text-red-800';
      case 'other':
      case 'lainnya':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-medium">{asset.name}</TableCell>
      <TableCell className="capitalize">
        {asset.type === 'other' ? 'Lainnya' : asset.type?.replace('-', ' ')}
      </TableCell>
      <TableCell className="font-mono text-sm">{asset.serial_number || '-'}</TableCell>
      <TableCell>
        {asset.brand && asset.model ? `${asset.brand} ${asset.model}` : 
         asset.brand || asset.model || '-'}
      </TableCell>
      <TableCell>
        <Badge className={getStatusBadgeColor(asset.status)} variant="secondary">
          {asset.status === 'other' ? 'Lainnya' : 
           asset.status?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-gray-600">
        {asset.status === 'in-use' ? (asset.assigned_employee_name ?? '-') : '-'}
      </TableCell>
      <TableCell className="text-xs text-gray-600">
        {asset.status === 'in-use' ? (asset.assigned_department_name ?? '-') : '-'}
      </TableCell>
      <TableCell>
        <Badge className={getConditionBadgeColor(asset.condition)} variant="secondary">
          {asset.condition === 'other' ? 'Lainnya' : 
           asset.condition?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-gray-600">
        {asset.requester_name ?? '-'}
      </TableCell>
      <TableCell className="text-xs text-gray-600">
        {asset.department_name ?? '-'}
      </TableCell>
      <TableCell>
        {fromPurchaseRequest ? (
          <Badge className={receiptConfirmed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} variant="secondary">
            {receiptStatusLabel}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        {asset.purchase_price ? `Rp ${asset.purchase_price.toLocaleString('id-ID')}` : '-'}
      </TableCell>
      <TableCell>
        {asset.purchase_date ? format(new Date(asset.purchase_date), 'dd/MM/yyyy') : '-'}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border shadow-lg">
            <DropdownMenuItem onClick={() => onViewDetails(asset)}>
              {t('companyAssets.viewDetails', 'View details')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditAsset(asset)}>
              {t('companyAssets.editAsset', 'Edit asset')}
            </DropdownMenuItem>
            {canManageAssignments && (asset.status !== 'in-use' || !asset.assigned_to_employee_id) && onAssign && (
              <DropdownMenuItem onClick={() => onAssign(asset)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('companyAssets.assignAsset', 'Assign / Handover')}
              </DropdownMenuItem>
            )}
            {canManageAssignments && asset.status === 'in-use' && asset.assigned_to_employee_id && onHandover && (
              <DropdownMenuItem onClick={() => onHandover(asset)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t('companyAssets.handoverAsset', 'Handover')}
              </DropdownMenuItem>
            )}
            {canManageAssignments && asset.status === 'in-use' && onReturn && (
              <DropdownMenuItem onClick={() => onReturn(asset)}>
                <Package className="h-4 w-4 mr-2" />
                {t('companyAssets.returnAsset', 'Return')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onDeleteAsset(asset)}
              className="text-red-600 focus:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('companyAssets.deleteAsset', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
