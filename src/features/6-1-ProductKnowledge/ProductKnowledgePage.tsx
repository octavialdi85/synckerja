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
import { useGenerateContent } from './hooks/useGenerateContent';
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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedSidebarItemId, setSelectedSidebarItemId] = useState<string | null>(null);
  
  // Fetch product knowledge data
  const { data: productKnowledgeData = [], isLoading } = useProductKnowledge();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const { data: subServices = [], isLoading: isLoadingSubServices } = useSubServices();
  const { addProductKnowledge, updateProductKnowledge, deleteProductKnowledge } = useProductKnowledgeMutations();
  const { profile } = useUserData();
  const { isGenerating, generateContent } = useGenerateContent();

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

  // Handle generate content for selected items
  const handleGenerateContent = useCallback(async () => {
    console.log('🚀 handleGenerateContent called', { 
      selectedItemsCount: selectedItems.length, 
      productKnowledgeDataCount: productKnowledgeData?.length 
    });

    if (selectedItems.length === 0) {
      toast.error(t('productKnowledge.toast.noItemsSelected', 'No items selected'));
      return;
    }

    if (!productKnowledgeData || productKnowledgeData.length === 0) {
      toast.error(t('productKnowledge.toast.noDataAvailable', 'No product knowledge data available'));
      return;
    }

    // Get selected items
    const selectedProductKnowledge = productKnowledgeData.filter(item => selectedItems.includes(item.id));

    console.log('📋 Selected product knowledge items:', selectedProductKnowledge.map(item => ({
      id: item.id,
      feature_name: item.feature_name,
      service_name: item.service_name,
      sub_service_name: item.sub_service_name
    })));

    if (selectedProductKnowledge.length === 0) {
      toast.error(t('productKnowledge.toast.noItemsSelected', 'No items selected'));
      return;
    }

    // Check API key first
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      toast.error('OpenAI API key tidak ditemukan. Pastikan VITE_OPENAI_API_KEY sudah diatur di file .env');
      console.error('❌ OpenAI API key tidak ditemukan');
      return;
    }

    // Show loading toast
    const loadingToastId = toast.loading(
      t('productKnowledge.toast.generatingContent', 'Generating content for {{count}} item(s)...', { 
        count: selectedProductKnowledge.length 
      })
    );

    try {
      let successCount = 0;
      let errorCount = 0;

      // Generate content for each selected item sequentially (to avoid rate limiting)
      for (let i = 0; i < selectedProductKnowledge.length; i++) {
        const item = selectedProductKnowledge[i];
        
        console.log(`🔄 Processing item ${i + 1}/${selectedProductKnowledge.length}:`, {
          id: item.id,
          feature_name: item.feature_name,
          service_name: item.service_name
        });

        // More lenient validation - just need some data to work with
        const hasData = item.feature_name || item.service_name || item.feature_description || 
                       (item.problems_solved && item.problems_solved.length > 0);
        
        if (!hasData) {
          const skipMsg = `Item ${i + 1}: Tidak ada data yang cukup untuk generate content. Minimal perlu feature name, service, atau description.`;
          console.warn('⚠️', skipMsg);
          toast.warning(skipMsg, { id: loadingToastId });
          errorCount++;
          continue;
        }

        try {
          const result = await generateContent(item);
          
          console.log(`📝 Generate result for item ${item.id}:`, {
            success: result?.success,
            hasFeatureDescription: !!result?.feature_description,
            hasImpact: !!result?.impact,
            hasSolusi: !!result?.solusi,
            competitiveAdvantageCount: result?.competitive_advantage?.length || 0,
            error: result?.error
          });

          if (result?.success) {
            // Update the item with generated content
            const updateData: any = {};
            
            if (result.feature_description) {
              updateData.feature_description = result.feature_description;
            }
            if (result.impact) {
              updateData.impact = result.impact;
            }
            if (result.solusi) {
              updateData.solusi = result.solusi;
            }
            if (result.competitive_advantage && result.competitive_advantage.length > 0) {
              updateData.competitive_advantage = result.competitive_advantage;
            }

            // Only update if there's data to update
            if (Object.keys(updateData).length > 0) {
              console.log(`💾 Updating item ${item.id} with:`, updateData);
              await updateProductKnowledge(item.id, updateData);
              successCount++;
              console.log(`✅ Successfully updated item ${item.id}`);
            } else {
              console.warn(`⚠️ No data to update for item ${item.id}`);
              errorCount++;
            }
          } else {
            errorCount++;
            const errorMsg = result?.error || 'Unknown error';
            console.error(`❌ Failed to generate content for item ${item.id}:`, errorMsg);
            
            // Show special error for quota or rate limit issues
            if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
              toast.error(
                `Quota OpenAI habis! Silakan top up di https://platform.openai.com/account/billing`,
                { id: loadingToastId, duration: 10000 }
              );
              // Stop processing other items if quota is exhausted
              break;
            } else if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
              toast.error(
                `⚠️ Rate limit OpenAI terlampaui. Silakan tunggu 1-2 menit sebelum mencoba lagi, atau upgrade tier OpenAI.`,
                { id: loadingToastId, duration: 12000 }
              );
              // Stop processing other items if rate limit hit
              // User should wait before trying again
              break;
            } else {
              toast.error(`Item ${i + 1}: ${errorMsg}`, { id: loadingToastId, duration: 5000 });
            }
          }
        } catch (itemError) {
          errorCount++;
          const errorMsg = itemError instanceof Error ? itemError.message : 'Unknown error';
          console.error(`❌ Error processing item ${item.id}:`, itemError);
          toast.error(`Item ${i + 1}: ${errorMsg}`, { id: loadingToastId, duration: 5000 });
        }

        // Longer delay between requests to avoid rate limiting (2 seconds)
        if (i < selectedProductKnowledge.length - 1) {
          console.log(`⏳ Waiting 2 seconds before processing next item...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Show success/error toast
      toast.dismiss(loadingToastId);
      
      console.log('📊 Generation summary:', { successCount, errorCount });
      
      if (successCount > 0) {
        toast.success(
          t('productKnowledge.toast.generateSuccess', 'Successfully generated content for {{count}} item(s)', { 
            count: successCount 
          })
        );
      }
      
      if (errorCount > 0) {
        toast.error(
          t('productKnowledge.toast.generatePartialError', 'Failed to generate content for {{count}} item(s)', { 
            count: errorCount 
          }),
          { duration: 5000 }
        );
      }

      if (successCount === 0 && errorCount === 0) {
        toast.warning('Tidak ada item yang diproses');
      }

    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error('❌ Error generating content:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        t('productKnowledge.toast.generateError', 'Error generating content: {{error}}', { 
          error: errorMsg
        }),
        { duration: 7000 }
      );
    }
  }, [selectedItems, productKnowledgeData, generateContent, updateProductKnowledge, t]);

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
                          selectedItems={selectedItems}
                          onAdd={handleAdd}
                          onDeleteSelected={handleDeleteSelected}
                          onGenerateContent={handleGenerateContent}
                          isGenerating={isGenerating}
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

