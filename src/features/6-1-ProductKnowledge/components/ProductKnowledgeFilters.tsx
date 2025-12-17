import React from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Service } from '../hooks/useServices';

interface ProductKnowledgeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedServiceId: string;
  setSelectedServiceId: (serviceId: string) => void;
  selectedItems: string[];
  services: Service[];
  onAdd: () => void;
  onDeleteSelected: () => void;
}

export const ProductKnowledgeFilters: React.FC<ProductKnowledgeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedServiceId,
  setSelectedServiceId,
  selectedItems,
  services = [],
  onAdd,
  onDeleteSelected,
}) => {
  const { t } = useAppTranslation();

  const handleAdd = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd();
  };

  const handleDeleteSelected = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteSelected();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder={t('productKnowledge.filters.searchPlaceholder', 'Search product knowledge...')} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder={t('productKnowledge.filters.servicePlaceholder', 'All Services')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('productKnowledge.filters.allServices', 'All Services')}
            </SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          type="button"
          size="sm" 
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('productKnowledge.filters.addButton', 'Add Product Knowledge')}
        </Button>
        {selectedItems.length > 0 && (
          <Button 
            type="button"
            size="sm" 
            variant="destructive" 
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('productKnowledge.filters.deleteSelected', 'Delete Selected ({{count}})', { count: selectedItems.length })}
          </Button>
        )}
      </div>
    </div>
  );
};

