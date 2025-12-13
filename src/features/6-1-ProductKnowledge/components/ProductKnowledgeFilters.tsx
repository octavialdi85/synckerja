import React from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface ProductKnowledgeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedItems: string[];
  onAdd: () => void;
  onDeleteSelected: () => void;
}

export const ProductKnowledgeFilters: React.FC<ProductKnowledgeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedItems,
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

