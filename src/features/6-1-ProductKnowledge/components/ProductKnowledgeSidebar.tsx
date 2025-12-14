import React, { useState, useMemo } from 'react';
import { useProductKnowledgeDetail, ProductKnowledgeDetail } from '../hooks/useProductKnowledgeDetail';
import { useProductKnowledgeStyle, ProductKnowledgeStyle } from '../hooks/useProductKnowledgeStyle';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { LoadingDots } from '@/components/LoadingDots';
import { BookOpen, Search, X, Plus, ChevronLeft, Palette, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { cn } from '@/lib/utils';
import { ProductKnowledgeDetailModal } from './ProductKnowledgeDetailModal';
import { useProductKnowledgeDetailMutations } from '../hooks/useProductKnowledgeDetail';
import { useProductKnowledgeStyleMutations } from '../hooks/useProductKnowledgeStyle';
import { toast } from 'sonner';
import { ProductKnowledgeSidebarFooter } from './ProductKnowledgeSidebarFooter';
import { StyleModal } from './StyleModal';

interface ProductKnowledgeSidebarProps {
  selectedItemId?: string | null;
  onSelectItem?: (id: string) => void;
}

export const ProductKnowledgeSidebar: React.FC<ProductKnowledgeSidebarProps> = ({
  selectedItemId,
  onSelectItem,
}) => {
  const { t } = useAppTranslation();
  const { data: productKnowledgeDetailData = [], isLoading } = useProductKnowledgeDetail();
  const { data: productKnowledgeStyleData = [], isLoading: isStylesLoading } = useProductKnowledgeStyle();
  const [searchTerm, setSearchTerm] = useState('');
  const [styleSearchTerm, setStyleSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ProductKnowledgeStyle | null>(null);
  const [deletingStyleId, setDeletingStyleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'style'>('knowledge');
  const [selectedDetail, setSelectedDetail] = useState<ProductKnowledgeDetail | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ProductKnowledgeStyle | null>(null);
  const {
    createProductKnowledgeDetail,
    isCreating,
  } = useProductKnowledgeDetailMutations();
  const {
    createProductKnowledgeStyle,
    updateProductKnowledgeStyle,
    deleteProductKnowledgeStyle,
    isCreating: isCreatingStyle,
    isUpdating: isUpdatingStyle,
    isDeleting: isDeletingStyle,
  } = useProductKnowledgeStyleMutations();

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return productKnowledgeDetailData;

    const searchLower = searchTerm.toLowerCase();
    return productKnowledgeDetailData.filter((item) => {
      return (
        item.product_knowledge_content?.toLowerCase().includes(searchLower) ||
        item.service_name?.toLowerCase().includes(searchLower) ||
        item.sub_service_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [productKnowledgeDetailData, searchTerm]);

  // Filter style data based on search term
  const filteredStyleData = useMemo(() => {
    if (!styleSearchTerm) return productKnowledgeStyleData;

    const searchLower = styleSearchTerm.toLowerCase();
    return productKnowledgeStyleData.filter((item) => {
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [productKnowledgeStyleData, styleSearchTerm]);

  // Get Product/Service name
  const getProductServiceName = (item: ProductKnowledgeDetail): string => {
    if (item.sub_service_name) {
      return `${item.service_name || 'N/A'} / ${item.sub_service_name}`;
    }
    if (item.service_name) {
      return item.service_name;
    }
    return 'N/A';
  };

  const handleItemClick = (id: string) => {
    const item = productKnowledgeDetailData.find((item) => item.id === id);
    if (item) {
      setSelectedDetail(item);
      if (onSelectItem) {
        onSelectItem(id);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedDetail(null);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSaveDetail = async (data: {
    service_id: string | null;
    sub_service_id: string | null;
    product_knowledge_content: string;
  }) => {
    try {
      await createProductKnowledgeDetail(data);
      toast.success(
        t(
          'productKnowledgeDetail.toast.createSuccess',
          'Product knowledge detail created successfully'
        )
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product knowledge detail:', error);
      toast.error(
        t('productKnowledgeDetail.toast.createError', 'Error creating product knowledge detail')
      );
      throw error;
    }
  };

  const handleSaveStyle = async (data: { name: string; description: string; structure?: string }) => {
    try {
      // Validate name
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        toast.error(t('productKnowledge.style.toast.nameRequired', 'Style name is required'));
        return;
      }

      if (editingStyle) {
        // Update existing style
        const updateInput: { name: string; description?: string; structure?: string } = {
          name: trimmedName,
        };
        
        // Only include description if it's provided and not empty
        if (data.description !== undefined && data.description !== null) {
          const trimmedDesc = data.description.trim();
          updateInput.description = trimmedDesc || undefined;
        }
        
        // Only include structure if it's provided and not empty
        if (data.structure !== undefined && data.structure !== null) {
          const trimmedStruct = data.structure.trim();
          updateInput.structure = trimmedStruct || undefined;
        }
        
        console.log('Updating style:', { 
          id: editingStyle.id, 
          input: updateInput,
          editingStyle: editingStyle 
        });
        
        try {
          await updateProductKnowledgeStyle({ id: editingStyle.id, input: updateInput });
        } catch (error: any) {
          console.error('Update error details:', {
            error,
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          });
          throw error;
        }
        toast.success(
          t('productKnowledge.style.toast.updateSuccess', 'Style updated successfully')
        );
        setEditingStyle(null);
        setIsStyleModalOpen(false);
      } else {
        // Create new style
        await createProductKnowledgeStyle({
          name: trimmedName,
          description: data.description?.trim() || undefined,
          structure: data.structure?.trim() || undefined,
        });
        toast.success(
          t('productKnowledge.style.toast.createSuccess', 'Style created successfully')
        );
        setIsStyleModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving style:', error);
      toast.error(
        editingStyle
          ? t('productKnowledge.style.toast.updateError', 'Error updating style')
          : t('productKnowledge.style.toast.createError', 'Error creating style')
      );
      throw error;
    }
  };

  const handleEditStyle = (style: ProductKnowledgeStyle, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    setEditingStyle(style);
    setIsStyleModalOpen(true);
  };

  const handleDeleteStyle = async (styleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    
    if (!confirm(t('productKnowledge.style.deleteConfirm', 'Are you sure you want to delete this style?'))) {
      return;
    }

    try {
      setDeletingStyleId(styleId);
      await deleteProductKnowledgeStyle(styleId);
      toast.success(
        t('productKnowledge.style.toast.deleteSuccess', 'Style deleted successfully')
      );
      // Clear selected style if it was the deleted one
      if (selectedStyle?.id === styleId) {
        setSelectedStyle(null);
      }
    } catch (error) {
      console.error('Error deleting style:', error);
      toast.error(t('productKnowledge.style.toast.deleteError', 'Error deleting style'));
    } finally {
      setDeletingStyleId(null);
    }
  };

  const handleStyleClick = (id: string) => {
    const style = productKnowledgeStyleData.find((item) => item.id === id);
    if (style) {
      setSelectedStyle(style);
    }
  };

  const handleBackToStyleList = () => {
    setSelectedStyle(null);
  };

  const handleClearStyleSearch = () => {
    setStyleSearchTerm('');
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm max-h-[calc(100vh-135px)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('knowledge');
              setSelectedDetail(null);
              setSelectedStyle(null);
            }}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === 'knowledge'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
            )}
          >
            {t('productKnowledge.sidebar.tabs.knowledge', 'Product Knowledge')}
          </button>
          <button
            onClick={() => {
              setActiveTab('style');
              setSelectedDetail(null);
              setSelectedStyle(null);
            }}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === 'style'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
            )}
          >
            {t('productKnowledge.sidebar.tabs.style', 'Style')}
          </button>
        </div>

        {/* Header Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {activeTab === 'knowledge' && selectedDetail ? (
              <button
                onClick={handleBackToList}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={t('productKnowledge.sidebar.backToList', 'Back to list')}
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            ) : activeTab === 'style' && selectedStyle ? (
              <button
                onClick={handleBackToStyleList}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={t('productKnowledge.style.sidebar.backToList', 'Back to list')}
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            ) : activeTab === 'knowledge' ? (
              <BookOpen className="h-5 w-5 text-gray-700" />
            ) : (
              <Palette className="h-5 w-5 text-gray-700" />
            )}
              <h2 className="text-lg font-semibold text-gray-800">
                {activeTab === 'knowledge'
                  ? selectedDetail
                    ? t('productKnowledge.sidebar.detailTitle', 'Product Knowledge Detail')
                    : t('productKnowledge.sidebar.title', 'Product Knowledge')
                  : selectedStyle
                    ? t('productKnowledge.style.sidebar.detailTitle', 'Style Detail')
                    : t('productKnowledge.sidebar.styleTitle', 'Style')}
              </h2>
            </div>
            {activeTab === 'knowledge' && !selectedDetail && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('productKnowledgeDetail.sidebar.addButton', 'Add')}
              </Button>
            )}
            {activeTab === 'style' && !selectedStyle && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingStyle(null);
                  setIsStyleModalOpen(true);
                }}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('productKnowledge.style.sidebar.addButton', 'Add Style')}
              </Button>
            )}
          </div>

          {/* Search Input - Only show in knowledge tab when not viewing detail */}
          {activeTab === 'knowledge' && !selectedDetail && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('productKnowledge.sidebar.searchPlaceholder', 'Search product knowledge...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Count */}
              <div className="mt-2 text-xs text-gray-500">
                {filteredData.length} {t('productKnowledge.sidebar.items', 'items')}
              </div>
            </>
          )}

          {/* Search Input - Only show in style tab when not viewing detail */}
          {activeTab === 'style' && !selectedStyle && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('productKnowledge.style.sidebar.searchPlaceholder', 'Search styles...')}
                  value={styleSearchTerm}
                  onChange={(e) => setStyleSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {styleSearchTerm && (
                  <button
                    onClick={handleClearStyleSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Count */}
              <div className="mt-2 text-xs text-gray-500">
                {filteredStyleData.length} {t('productKnowledge.style.sidebar.items', 'styles')}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
        {activeTab === 'knowledge' ? (
          selectedDetail ? (
          /* Detail View */
          <div className="p-4 space-y-4">
            {/* Service/Sub Service Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">
                  {t('productKnowledge.detail.service', 'Service')}:
                </span>
                <span>{selectedDetail.service_name || t('productKnowledge.detail.notSet', 'Not set')}</span>
              </div>
              {selectedDetail.sub_service_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">
                    {t('productKnowledge.detail.subService', 'Sub Service')}:
                  </span>
                  <span>{selectedDetail.sub_service_name}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Full Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">
                {t('productKnowledge.detail.content', 'Product Knowledge Content')}
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p
                  className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                  style={{ wordBreak: 'break-word' }}
                >
                  {selectedDetail.product_knowledge_content || t('productKnowledge.detail.noContent', 'No content available')}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                {selectedDetail.created_at && (
                  <div>
                    {t('productKnowledge.detail.createdAt', 'Created')}:{' '}
                    {new Date(selectedDetail.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                {selectedDetail.updated_at && selectedDetail.updated_at !== selectedDetail.created_at && (
                  <div>
                    {t('productKnowledge.detail.updatedAt', 'Updated')}:{' '}
                    {new Date(selectedDetail.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingDots />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  {searchTerm
                    ? t('productKnowledge.sidebar.noResults', 'No results found')
                    : t('productKnowledge.sidebar.noData', 'No product knowledge available')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredData.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-colors border',
                        isSelected
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      )}
                    >
                      {/* Service/Sub Service as Title */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={cn(
                            'font-medium text-sm line-clamp-2',
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          )}
                        >
                          {getProductServiceName(item) !== 'N/A'
                            ? getProductServiceName(item)
                            : t('productKnowledge.sidebar.unnamed', 'Unnamed')}
                        </h3>
                      </div>

                      {/* Product Knowledge Content Preview */}
                      {item.product_knowledge_content && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {item.product_knowledge_content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
          )
        ) : selectedStyle ? (
          /* Style Detail View */
          <div className="p-4 space-y-4 pb-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingStyle(selectedStyle);
                  setIsStyleModalOpen(true);
                }}
                disabled={isUpdatingStyle || isDeletingStyle}
                className="h-8 px-3"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledge.style.edit', 'Edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!confirm(t('productKnowledge.style.deleteConfirm', 'Are you sure you want to delete this style?'))) {
                    return;
                  }

                  try {
                    setDeletingStyleId(selectedStyle.id);
                    await deleteProductKnowledgeStyle(selectedStyle.id);
                    toast.success(
                      t('productKnowledge.style.toast.deleteSuccess', 'Style deleted successfully')
                    );
                    setSelectedStyle(null);
                  } catch (error) {
                    console.error('Error deleting style:', error);
                    toast.error(t('productKnowledge.style.toast.deleteError', 'Error deleting style'));
                  } finally {
                    setDeletingStyleId(null);
                  }
                }}
                disabled={isUpdatingStyle || isDeletingStyle || deletingStyleId === selectedStyle.id}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledge.style.delete', 'Delete')}
              </Button>
            </div>

            {/* Style Name */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">
                {t('productKnowledge.style.detail.name', 'Style Name')}
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{selectedStyle.name}</p>
              </div>
            </div>

            {/* Style Description */}
            {selectedStyle.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('productKnowledge.style.detail.description', 'Description')}
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p
                    className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {selectedStyle.description}
                  </p>
                </div>
              </div>
            )}

            {/* Style Structure */}
            {selectedStyle.structure && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('productKnowledge.style.detail.structure', 'Structure')}
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p
                    className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {selectedStyle.structure}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                {selectedStyle.created_at && (
                  <div>
                    {t('productKnowledge.style.detail.createdAt', 'Created')}:{' '}
                    {new Date(selectedStyle.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                {selectedStyle.updated_at && selectedStyle.updated_at !== selectedStyle.created_at && (
                  <div>
                    {t('productKnowledge.style.detail.updatedAt', 'Updated')}:{' '}
                    {new Date(selectedStyle.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Style List View */
          <>
            {isStylesLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingDots />
              </div>
            ) : filteredStyleData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Palette className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  {styleSearchTerm
                    ? t('productKnowledge.style.sidebar.noResults', 'No results found')
                    : t('productKnowledge.style.sidebar.noData', 'No styles available')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredStyleData.map((style) => (
                  <div
                    key={style.id}
                    onClick={() => handleStyleClick(style.id)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-colors border',
                      selectedStyle?.id === style.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            'font-medium text-sm line-clamp-2',
                            selectedStyle?.id === style.id ? 'text-blue-900' : 'text-gray-900'
                          )}
                        >
                          {style.name}
                        </h3>
                        {style.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{style.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditStyle(style, e)}
                          className={cn(
                            'p-1.5 rounded hover:bg-gray-200 transition-colors',
                            selectedStyle?.id === style.id ? 'text-blue-700' : 'text-gray-600'
                          )}
                          title={t('productKnowledge.style.edit', 'Edit style')}
                          disabled={isUpdatingStyle || isDeletingStyle}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteStyle(style.id, e)}
                          className={cn(
                            'p-1.5 rounded hover:bg-red-100 transition-colors',
                            selectedStyle?.id === style.id ? 'text-red-700' : 'text-red-600',
                            deletingStyleId === style.id && 'opacity-50 cursor-not-allowed'
                          )}
                          title={t('productKnowledge.style.delete', 'Delete style')}
                          disabled={isUpdatingStyle || isDeletingStyle || deletingStyleId === style.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* Footer */}
      <ProductKnowledgeSidebarFooter
        totalItems={activeTab === 'knowledge' ? filteredData.length : filteredStyleData.length}
      />

      {/* Modals */}
      <ProductKnowledgeDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveDetail}
        isLoading={isCreating}
      />
      <StyleModal
        open={isStyleModalOpen}
        onOpenChange={(open) => {
          setIsStyleModalOpen(open);
          if (!open) {
            setEditingStyle(null);
          }
        }}
        onSave={handleSaveStyle}
        isLoading={isCreatingStyle || isUpdatingStyle}
        initialData={editingStyle}
      />
    </div>
  );
};

