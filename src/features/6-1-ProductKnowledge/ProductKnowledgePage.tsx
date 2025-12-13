import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '../6-1-ContentCalendar/container/HeaderAndTab';
import { RealtimeSocialMediaProvider } from '@/features/6-1-dashboard/hook/RealtimeSocialMediaProvider';
import OptimizedErrorBoundary from '@/features/6-1-dashboard/OptimizedErrorBoundary';
import { PICFilterProvider } from '@/features/6-1-dashboard/PICFilterContext';
import { useProductKnowledge } from './hooks/useProductKnowledge';
import { useProductKnowledgeMutations } from './hooks/useProductKnowledgeMutations';
import { useServices } from './hooks/useServices';
import { useSubServices } from './hooks/useSubServices';
import { ProductKnowledgeTable } from './components/ProductKnowledgeTable';
import { ProductKnowledgeFilters } from './components/ProductKnowledgeFilters';
import { toast } from 'sonner';
import { useUserData } from '@/features/6-1-dashboard/hook/useUserData';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const ProductKnowledgeContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [activeMainTab, setActiveMainTab] = useState('product-knowledge');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Fetch product knowledge data
  const { data: productKnowledgeData = [], isLoading } = useProductKnowledge();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const { data: subServices = [], isLoading: isLoadingSubServices } = useSubServices();
  const { addProductKnowledge, updateProductKnowledge, deleteProductKnowledge } = useProductKnowledgeMutations();
  const { profile } = useUserData();

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return productKnowledgeData;
    
    const searchLower = searchTerm.toLowerCase();
    return productKnowledgeData.filter(item => {
      const competitiveAdvantageStr = Array.isArray(item.competitive_advantage) 
        ? item.competitive_advantage.join(' ') 
        : (typeof item.competitive_advantage === 'string' ? item.competitive_advantage : JSON.stringify(item.competitive_advantage || ''));
      
      return item.feature_name?.toLowerCase().includes(searchLower) ||
        item.feature_description?.toLowerCase().includes(searchLower) ||
        item.impact?.toLowerCase().includes(searchLower) ||
        item.solusi?.toLowerCase().includes(searchLower) ||
        item.problems_solved?.some(p => p.toLowerCase().includes(searchLower)) ||
        item.service_name?.toLowerCase().includes(searchLower) ||
        item.sub_service_name?.toLowerCase().includes(searchLower) ||
        competitiveAdvantageStr?.toLowerCase().includes(searchLower);
    });
  }, [productKnowledgeData, searchTerm]);

  // Handle select item
  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedItems(prev => {
      if (checked) {
        return [...prev, id];
      } else {
        return prev.filter(itemId => itemId !== id);
      }
    });
  }, []);

  // Handle add new product knowledge
  const handleAdd = useCallback(async () => {
    if (!profile?.id) {
      toast.error(t('productKnowledge.toast.errorValidatingUser', 'Error validating user data'));
      return;
    }

    try {
      addProductKnowledge({
        feature_name: '',
        feature_description: '',
        problems_solved: [],
        impact: '',
        solusi: null,
        target_audience: null,
        competitive_advantage: null,
        // Don't set fields that don't exist in the table
      });
    } catch (error) {
      console.error('Error adding new row:', error);
      toast.error(t('productKnowledge.toast.errorAddingRow', 'Error adding new row'));
    }
  }, [profile?.id, addProductKnowledge, t]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.error(t('productKnowledge.toast.noItemsSelected', 'No items selected'));
      return;
    }
    
    const confirmMessage = t('productKnowledge.toast.confirmDelete', 'Are you sure you want to delete {{count}} selected item(s)?', { count: selectedItems.length });
    if (window.confirm(confirmMessage)) {
      try {
        selectedItems.forEach(id => deleteProductKnowledge(id));
        setSelectedItems([]);
      } catch (error) {
        console.error('Error deleting items:', error);
        toast.error(t('productKnowledge.toast.errorDeletingItems', 'Error deleting items'));
      }
    }
  }, [selectedItems, deleteProductKnowledge, t]);

  // Handle field change
  const handleFieldChange = useCallback((id: string, field: string, value: any) => {
    updateProductKnowledge(id, { [field]: value });
  }, [updateProductKnowledge]);

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden max-w-full">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeMainTab={activeMainTab}
                  handleTabChange={handleTabChange}
                />
              </div>
              
              {/* Main Content Area */}
              <div className="flex-1 min-h-0 min-w-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
                  {/* Filters Section - Sticky at top */}
                  <div className="sticky top-0 p-4 pb-3 flex-shrink-0 border-b-2 border-gray-300 bg-white z-20">
                    <ProductKnowledgeFilters
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      selectedItems={selectedItems}
                      onAdd={handleAdd}
                      onDeleteSelected={handleDeleteSelected}
                    />
                  </div>
                  
                  {/* Scrollable Content Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll p-6">
                    {/* Product Knowledge Table */}
                    <div className="w-full min-w-0 overflow-x-auto">
                      <ProductKnowledgeTable 
                        data={filteredData}
                        isLoading={isLoading || isLoadingServices || isLoadingSubServices}
                        selectedItems={selectedItems}
                        onSelectItem={handleSelectItem}
                        onFieldChange={handleFieldChange}
                        services={services}
                        subServices={subServices}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

// Main export with providers (matching ContentCalendarPage pattern)
const ProductKnowledgePage = () => {
  return (
    <OptimizedErrorBoundary>
      <RealtimeSocialMediaProvider>
        <PICFilterProvider>
          <ProductKnowledgeContent />
        </PICFilterProvider>
      </RealtimeSocialMediaProvider>
    </OptimizedErrorBoundary>
  );
};

export default ProductKnowledgePage;

