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
import { ProductKnowledgeSidebar } from './components/ProductKnowledgeSidebar';

const ProductKnowledgeContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [activeMainTab, setActiveMainTab] = useState('product-knowledge');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedSidebarItemId, setSelectedSidebarItemId] = useState<string | null>(null);
  
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

  // Filter data based on search term and service
  const filteredData = useMemo(() => {
    let filtered = productKnowledgeData;

    // Filter by service
    if (selectedServiceId && selectedServiceId !== 'all') {
      filtered = filtered.filter(item => item.service_id === selectedServiceId);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
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
          item.false_belief?.toLowerCase().includes(searchLower) ||
          item.false_belief_impact?.toLowerCase().includes(searchLower) ||
          item.what_makes_them_stop?.toLowerCase().includes(searchLower) ||
          competitiveAdvantageStr?.toLowerCase().includes(searchLower);
      });
    }

    return filtered;
  }, [productKnowledgeData, searchTerm, selectedServiceId]);

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
              
              {/* Main Grid Layout - Table and Sidebar */}
              <div className="flex-1 min-h-0">
                <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 h-full">
                  {/* Left Section - Main Content (75% width / 9 cols) */}
                  <div className="col-span-9 space-y-2 flex flex-col min-h-0 h-full">
                    {/* Product Knowledge Table */}
                    <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 relative h-full">
                  {/* Filters Section - Sticky at top */}
                  <div className="sticky top-0 p-4 pb-3 flex-shrink-0 border-b-2 border-gray-300 bg-white z-20">
                    <ProductKnowledgeFilters
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      selectedServiceId={selectedServiceId}
                      setSelectedServiceId={setSelectedServiceId}
                      selectedItems={selectedItems}
                      services={services}
                      onAdd={handleAdd}
                      onDeleteSelected={handleDeleteSelected}
                    />
                  </div>
                  
                  {/* Scrollable Content Area */}
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll max-h-[calc(100vh-120px)]">
                        <div className="p-6 w-full min-w-0 overflow-x-auto">
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

                  {/* Right Section - Sidebar (25% width / 3 cols) */}
                  <div className="col-span-3 flex flex-col min-h-0 h-full">
                    <ProductKnowledgeSidebar
                      selectedItemId={selectedSidebarItemId}
                      onSelectItem={(id) => setSelectedSidebarItemId(id)}
                    />
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

