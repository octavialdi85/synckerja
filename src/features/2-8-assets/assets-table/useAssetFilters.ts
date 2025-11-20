
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

interface UseAssetFiltersProps {
  assets: Asset[];
  searchTerm: string;
  selectedCategory: string;
  selectedStatus: string;
  selectedCondition: string;
}

export const useAssetFilters = ({ 
  assets, 
  searchTerm, 
  selectedCategory, 
  selectedStatus, 
  selectedCondition 
}: UseAssetFiltersProps) => {
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = searchTerm === '' || 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All Types' || 
      asset.type?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Lainnya' && asset.type?.toLowerCase() === 'other');

    const matchesStatus = selectedStatus === 'All Statuses' || 
      asset.status?.toLowerCase() === selectedStatus.toLowerCase().replace(' ', '-') ||
      (selectedStatus === 'Lainnya' && asset.status?.toLowerCase() === 'other');

    const matchesCondition = selectedCondition === 'All Conditions' || 
      asset.condition?.toLowerCase() === selectedCondition.toLowerCase() ||
      (selectedCondition === 'Lainnya' && asset.condition?.toLowerCase() === 'other');

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
  });

  return { filteredAssets };
};
