
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { X } from 'lucide-react';
import { AssetImage } from './asset-details/AssetImage';
import { AssetBasicInfo } from './asset-details/AssetBasicInfo';
import { AssetIdentifiers } from './asset-details/AssetIdentifiers';
import { AssetStatusCondition } from './asset-details/AssetStatusCondition';
import { AssetPurchaseInfo } from './asset-details/AssetPurchaseInfo';
import { AssetNotes } from './asset-details/AssetNotes';
import { AssetCreatedDate } from './asset-details/AssetCreatedDate';

interface Asset {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  asset_tag: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  purchase_price: number;
  purchase_date: string;
  notes: string;
  image_url: string;
  created_at: string;
}

interface ViewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}

export const ViewAssetModal = ({ isOpen, onClose, asset }: ViewAssetModalProps) => {
  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader className="flex flex-row items-center justify-between pb-3">
          <DialogTitle className="text-lg font-semibold">Asset Details</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          <AssetImage imageUrl={asset.image_url} assetName={asset.name} />
          
          <AssetBasicInfo 
            name={asset.name}
            type={asset.type}
            brand={asset.brand}
            model={asset.model}
          />
          
          <AssetIdentifiers 
            serialNumber={asset.serial_number}
            assetTag={asset.asset_tag}
          />
          
          <AssetStatusCondition 
            status={asset.status}
            condition={asset.condition}
          />
          
          <AssetPurchaseInfo 
            purchasePrice={asset.purchase_price}
            purchaseDate={asset.purchase_date}
          />
          
          <AssetNotes notes={asset.notes} />
          
          <AssetCreatedDate createdAt={asset.created_at} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
