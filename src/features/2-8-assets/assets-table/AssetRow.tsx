
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
}

interface AssetRowProps {
  asset: Asset;
  onViewDetails: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

export const AssetRow = ({ asset, onViewDetails, onEditAsset, onDeleteAsset }: AssetRowProps) => {
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
      <TableCell>
        <Badge className={getConditionBadgeColor(asset.condition)} variant="secondary">
          {asset.condition === 'other' ? 'Lainnya' : 
           asset.condition?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
        </Badge>
      </TableCell>
      <TableCell>
        {asset.purchase_date ? format(new Date(asset.purchase_date), 'dd/MM/yyyy') : '-'}
      </TableCell>
      <TableCell>
        {asset.purchase_price ? `Rp ${asset.purchase_price.toLocaleString('id-ID')}` : '-'}
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
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditAsset(asset)}>
              Edit Asset
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeleteAsset(asset)}
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
