
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { X, Package } from 'lucide-react';
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
      <DialogContent className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col bg-white" hideCloseButton>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-semibold">Asset Details</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto hover:bg-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          {/* Image Section */}
          {asset.image_url && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <AssetImage imageUrl={asset.image_url} assetName={asset.name} />
            </div>
          )}
          
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <AssetBasicInfo 
              name={asset.name}
              type={asset.type}
              brand={asset.brand}
              model={asset.model}
            />
          </div>
          
          {/* Identifiers Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Identification</h3>
            <AssetIdentifiers 
              serialNumber={asset.serial_number}
              assetTag={asset.asset_tag}
            />
          </div>
          
          {/* Status & Condition Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Status & Condition</h3>
            <AssetStatusCondition 
              status={asset.status}
              condition={asset.condition}
            />
          </div>
          
          {/* Purchase Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Purchase Information</h3>
            <AssetPurchaseInfo 
              purchasePrice={asset.purchase_price}
              purchaseDate={asset.purchase_date}
            />
          </div>
          
          {/* Notes Section */}
          {asset.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Additional Notes</h3>
              <AssetNotes notes={asset.notes} />
            </div>
          )}
          
          {/* Created Date Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <AssetCreatedDate createdAt={asset.created_at} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
