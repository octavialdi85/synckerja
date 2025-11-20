import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
} from '@/features/ui/table';
import { ViewAssetModal } from './ViewAssetModal';
import { EditAssetModal } from './EditAssetModal';
import { supabase } from '@/integrations/supabase/client';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { AssetRow } from './assets-table/AssetRow';
import { AssetsTableHeader } from './assets-table/AssetsTableHeader';
import { AssetsEmptyState } from './assets-table/AssetsEmptyState';
import { DeleteAssetDialog } from './assets-table/DeleteAssetDialog';
import { useAssetFilters } from './assets-table/useAssetFilters';

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

interface AssetsTableProps {
  assets: Asset[];
  searchTerm: string;
  selectedCategory: string;
  selectedStatus: string;
  selectedCondition: string;
  isLoading?: boolean;
  onRefresh: () => void;
}

export const AssetsTable = ({ 
  assets, 
  searchTerm, 
  selectedCategory, 
  selectedStatus, 
  selectedCondition,
  isLoading = false,
  onRefresh
}: AssetsTableProps) => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const showToast = useShowToast();

  const { filteredAssets } = useAssetFilters({
    assets,
    searchTerm,
    selectedCategory,
    selectedStatus,
    selectedCondition
  });

  const handleViewDetails = useCallback((asset: Asset) => {
    console.log('Opening view modal for asset:', asset.id);
    setSelectedAsset(asset);
    setViewModalOpen(true);
  }, []);

  const handleEditAsset = useCallback((asset: Asset) => {
    console.log('Opening edit modal for asset:', asset.id);
    setSelectedAsset(asset);
    setEditModalOpen(true);
  }, []);

  const handleDeleteAsset = useCallback((asset: Asset) => {
    console.log('Opening delete dialog for asset:', asset.id);
    setSelectedAsset(asset);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseViewModal = useCallback(() => {
    console.log('Closing view modal');
    setViewModalOpen(false);
    setSelectedAsset(null);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    console.log('Closing edit modal');
    setEditModalOpen(false);
    setSelectedAsset(null);
  }, []);

  const confirmDeleteAsset = async () => {
    if (!selectedAsset) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('company_assets')
        .delete()
        .eq('id', selectedAsset.id);

      if (error) {
        throw error;
      }

      showToast({
        title: 'Success',
        description: 'Asset deleted successfully',
        variant: 'default'
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedAsset(null);

    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to delete asset',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAssets = filteredAssets.length > 0;

  if (isLoading || !hasAssets) {
    return <AssetsEmptyState isLoading={isLoading} hasAssets={hasAssets} />;
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <AssetsTableHeader />
          <TableBody>
            {filteredAssets.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onViewDetails={handleViewDetails}
                onEditAsset={handleEditAsset}
                onDeleteAsset={handleDeleteAsset}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <ViewAssetModal
        isOpen={viewModalOpen}
        onClose={handleCloseViewModal}
        asset={selectedAsset}
      />

      <EditAssetModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        onSave={() => {
          onRefresh();
          handleCloseEditModal();
        }}
        asset={selectedAsset}
      />

      <DeleteAssetDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteAsset}
        isDeleting={isDeleting}
        asset={selectedAsset}
      />
    </>
  );
};
