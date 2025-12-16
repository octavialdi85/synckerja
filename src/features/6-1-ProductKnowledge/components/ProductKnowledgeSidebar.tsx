import React, { useState, useMemo } from 'react';
import { useProductKnowledgeDetail, ProductKnowledgeDetail } from '../hooks/useProductKnowledgeDetail';
import { useProductKnowledgeStyle, ProductKnowledgeStyle } from '../hooks/useProductKnowledgeStyle';
import { useProductKnowledgeHooks, ProductKnowledgeHook } from '../hooks/useProductKnowledgeHooks';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { LoadingDots } from '@/components/LoadingDots';
import { BookOpen, Search, X, Plus, ChevronLeft, Palette, Edit, Trash2, Link2, Copy } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { cn } from '@/lib/utils';
import { ProductKnowledgeDetailModal } from './ProductKnowledgeDetailModal';
import { useProductKnowledgeDetailMutations } from '../hooks/useProductKnowledgeDetail';
import { useProductKnowledgeStyleMutations } from '../hooks/useProductKnowledgeStyle';
import { useProductKnowledgeHooksMutations } from '../hooks/useProductKnowledgeHooks';
import { toast } from 'sonner';
import { ProductKnowledgeSidebarFooter } from './ProductKnowledgeSidebarFooter';
import { StyleModal } from './StyleModal';
import { HooksModal } from './HooksModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';

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
  const { data: productKnowledgeHooksData = [], isLoading: isHooksLoading } = useProductKnowledgeHooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [styleSearchTerm, setStyleSearchTerm] = useState('');
  const [hooksSearchTerm, setHooksSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isHooksModalOpen, setIsHooksModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<ProductKnowledgeDetail | null>(null);
  const [editingStyle, setEditingStyle] = useState<ProductKnowledgeStyle | null>(null);
  const [editingHook, setEditingHook] = useState<ProductKnowledgeHook | null>(null);
  const [deletingDetailId, setDeletingDetailId] = useState<string | null>(null);
  const [deletingStyleId, setDeletingStyleId] = useState<string | null>(null);
  const [deletingHookId, setDeletingHookId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'style' | 'hooks'>('knowledge');
  const [selectedDetail, setSelectedDetail] = useState<ProductKnowledgeDetail | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ProductKnowledgeStyle | null>(null);
  const [selectedHook, setSelectedHook] = useState<ProductKnowledgeHook | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteDetailId, setPendingDeleteDetailId] = useState<string | null>(null);
  const {
    createProductKnowledgeDetail,
    updateProductKnowledgeDetail,
    deleteProductKnowledgeDetail,
    isCreating,
    isUpdating: isUpdatingDetail,
    isDeleting: isDeletingDetail,
  } = useProductKnowledgeDetailMutations();
  const {
    createProductKnowledgeStyle,
    updateProductKnowledgeStyle,
    deleteProductKnowledgeStyle,
    isCreating: isCreatingStyle,
    isUpdating: isUpdatingStyle,
    isDeleting: isDeletingStyle,
  } = useProductKnowledgeStyleMutations();
  const {
    createProductKnowledgeHook,
    updateProductKnowledgeHook,
    deleteProductKnowledgeHook,
    isCreating: isCreatingHook,
    isUpdating: isUpdatingHook,
    isDeleting: isDeletingHook,
  } = useProductKnowledgeHooksMutations();

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

  // Filter hooks data based on search term
  const filteredHooksData = useMemo(() => {
    if (!hooksSearchTerm) return productKnowledgeHooksData;

    const searchLower = hooksSearchTerm.toLowerCase();
    return productKnowledgeHooksData.filter((item) => {
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.hook_content?.toLowerCase().includes(searchLower)
      );
    });
  }, [productKnowledgeHooksData, hooksSearchTerm]);

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
      if (editingDetail) {
        // Update existing detail
        await updateProductKnowledgeDetail({
          id: editingDetail.id,
          data: {
            service_id: data.service_id,
            sub_service_id: data.sub_service_id,
            product_knowledge_content: data.product_knowledge_content,
          },
        });
        toast.success(
          t(
            'productKnowledgeDetail.toast.updateSuccess',
            'Product knowledge detail updated successfully'
          )
        );
        setEditingDetail(null);
        setIsModalOpen(false);
      } else {
        // Create new detail
        await createProductKnowledgeDetail(data);
        toast.success(
          t(
            'productKnowledgeDetail.toast.createSuccess',
            'Product knowledge detail created successfully'
          )
        );
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving product knowledge detail:', error);
      toast.error(
        editingDetail
          ? t('productKnowledgeDetail.toast.updateError', 'Error updating product knowledge detail')
          : t('productKnowledgeDetail.toast.createError', 'Error creating product knowledge detail')
      );
      throw error;
    }
  };

  const handleEditDetail = (detail: ProductKnowledgeDetail, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    setEditingDetail(detail);
    setIsModalOpen(true);
  };

  const handleDeleteDetail = (detailId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    setPendingDeleteDetailId(detailId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteDetail = async () => {
    if (!pendingDeleteDetailId) return;

    try {
      setDeletingDetailId(pendingDeleteDetailId);
      await deleteProductKnowledgeDetail(pendingDeleteDetailId);
      toast.success(
        t('productKnowledgeDetail.toast.deleteSuccess', 'Product knowledge detail deleted successfully')
      );
      // Clear selected detail if it was the deleted one
      if (selectedDetail?.id === pendingDeleteDetailId) {
        setSelectedDetail(null);
      }
      setDeleteConfirmOpen(false);
      setPendingDeleteDetailId(null);
    } catch (error) {
      console.error('Error deleting product knowledge detail:', error);
      toast.error(t('productKnowledgeDetail.toast.deleteError', 'Error deleting product knowledge detail'));
    } finally {
      setDeletingDetailId(null);
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(
        t('productKnowledgeDetail.toast.copySuccess', 'Content copied to clipboard')
      );
    } catch (error) {
      console.error('Error copying content:', error);
      toast.error(t('productKnowledgeDetail.toast.copyError', 'Error copying content'));
    }
  };

  const handleSaveStyle = async (data: { name: string; description: string; structure?: string; content_pillar_ids?: string[] }) => {
    try {
      // Validate name
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        toast.error(t('productKnowledge.style.toast.nameRequired', 'Style name is required'));
        return;
      }

      if (editingStyle) {
        // Update existing style
        const updateInput: { name: string; description?: string; structure?: string; content_pillar_ids?: string[] } = {
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
        
        // Include content_pillar_ids (empty array means universal)
        if (data.content_pillar_ids !== undefined) {
          updateInput.content_pillar_ids = data.content_pillar_ids.length > 0 ? data.content_pillar_ids : [];
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
          content_pillar_ids: data.content_pillar_ids && data.content_pillar_ids.length > 0 
            ? data.content_pillar_ids 
            : [],
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

  const handleClearHooksSearch = () => {
    setHooksSearchTerm('');
  };

  const handleSaveHook = async (data: { name: string; description?: string; hook_content?: string }) => {
    try {
      // Validate name
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        toast.error(t('productKnowledge.hooks.toast.nameRequired', 'Hook name is required'));
        return;
      }

      if (editingHook) {
        // Update existing hook
        const updateInput: { name: string; description?: string; hook_content?: string } = {
          name: trimmedName,
        };
        
        // Only include description if it's provided and not empty
        if (data.description !== undefined && data.description !== null) {
          const trimmedDesc = data.description.trim();
          updateInput.description = trimmedDesc || undefined;
        }
        
        // Only include hook_content if it's provided and not empty
        if (data.hook_content !== undefined && data.hook_content !== null) {
          const trimmedContent = data.hook_content.trim();
          updateInput.hook_content = trimmedContent || undefined;
        }
        
        await updateProductKnowledgeHook({ id: editingHook.id, input: updateInput });
        toast.success(
          t('productKnowledge.hooks.toast.updateSuccess', 'Hook updated successfully')
        );
        setEditingHook(null);
        setIsHooksModalOpen(false);
      } else {
        // Create new hook
        await createProductKnowledgeHook({
          name: trimmedName,
          description: data.description?.trim() || undefined,
          hook_content: data.hook_content?.trim() || undefined,
        });
        toast.success(
          t('productKnowledge.hooks.toast.createSuccess', 'Hook created successfully')
        );
        setIsHooksModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving hook:', error);
      toast.error(
        editingHook
          ? t('productKnowledge.hooks.toast.updateError', 'Error updating hook')
          : t('productKnowledge.hooks.toast.createError', 'Error creating hook')
      );
      throw error;
    }
  };

  const handleEditHook = (hook: ProductKnowledgeHook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHook(hook);
    setIsHooksModalOpen(true);
  };

  const handleDeleteHook = async (hookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(t('productKnowledge.hooks.deleteConfirm', 'Are you sure you want to delete this hook?'))) {
      return;
    }

    try {
      setDeletingHookId(hookId);
      await deleteProductKnowledgeHook(hookId);
      toast.success(
        t('productKnowledge.hooks.toast.deleteSuccess', 'Hook deleted successfully')
      );
      // Clear selected hook if it was the deleted one
      if (selectedHook?.id === hookId) {
        setSelectedHook(null);
      }
    } catch (error) {
      console.error('Error deleting hook:', error);
      toast.error(t('productKnowledge.hooks.toast.deleteError', 'Error deleting hook'));
    } finally {
      setDeletingHookId(null);
    }
  };

  const handleHookClick = (id: string) => {
    const hook = productKnowledgeHooksData.find((item) => item.id === id);
    if (hook) {
      setSelectedHook(hook);
    }
  };

  const handleBackToHooksList = () => {
    setSelectedHook(null);
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
              setSelectedHook(null);
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
              setSelectedHook(null);
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
          <button
            onClick={() => {
              setActiveTab('hooks');
              setSelectedDetail(null);
              setSelectedStyle(null);
              setSelectedHook(null);
            }}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === 'hooks'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
            )}
          >
            {t('productKnowledge.sidebar.tabs.hooks', 'Hooks')}
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
            ) : activeTab === 'hooks' && selectedHook ? (
              <button
                onClick={handleBackToHooksList}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={t('productKnowledge.hooks.sidebar.backToList', 'Back to list')}
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            ) : activeTab === 'knowledge' ? (
              <BookOpen className="h-5 w-5 text-gray-700" />
            ) : activeTab === 'style' ? (
              <Palette className="h-5 w-5 text-gray-700" />
            ) : (
              <Link2 className="h-5 w-5 text-gray-700" />
            )}
              <h2 className="text-lg font-semibold text-gray-800">
                {activeTab === 'knowledge'
                  ? selectedDetail
                    ? t('productKnowledge.sidebar.detailTitle', 'Product Knowledge Detail')
                    : t('productKnowledge.sidebar.title', 'Product Knowledge')
                  : activeTab === 'style'
                    ? selectedStyle
                      ? t('productKnowledge.style.sidebar.detailTitle', 'Style Detail')
                      : t('productKnowledge.sidebar.styleTitle', 'Style')
                    : selectedHook
                      ? t('productKnowledge.hooks.sidebar.detailTitle', 'Hook Detail')
                      : t('productKnowledge.sidebar.hooksTitle', 'Hooks')}
              </h2>
            </div>
            {activeTab === 'knowledge' && !selectedDetail && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingDetail(null);
                  setIsModalOpen(true);
                }}
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
            {activeTab === 'hooks' && !selectedHook && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingHook(null);
                  setIsHooksModalOpen(true);
                }}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('productKnowledge.hooks.sidebar.addButton', 'Add')}
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

          {/* Search Input - Only show in hooks tab when not viewing detail */}
          {activeTab === 'hooks' && !selectedHook && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('productKnowledge.hooks.sidebar.searchPlaceholder', 'Search hooks...')}
                  value={hooksSearchTerm}
                  onChange={(e) => setHooksSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {hooksSearchTerm && (
                  <button
                    onClick={handleClearHooksSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Count */}
              <div className="mt-2 text-xs text-gray-500">
                {filteredHooksData.length} {t('productKnowledge.hooks.sidebar.items', 'hooks')}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
        {activeTab === 'hooks' ? (
          selectedHook ? (
          /* Hook Detail View */
          <div className="p-4 space-y-4 pb-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingHook(selectedHook);
                  setIsHooksModalOpen(true);
                }}
                disabled={isUpdatingHook || isDeletingHook}
                className="h-8 px-3"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledge.hooks.edit', 'Edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!confirm(t('productKnowledge.hooks.deleteConfirm', 'Are you sure you want to delete this hook?'))) {
                    return;
                  }

                  try {
                    setDeletingHookId(selectedHook.id);
                    await deleteProductKnowledgeHook(selectedHook.id);
                    toast.success(
                      t('productKnowledge.hooks.toast.deleteSuccess', 'Hook deleted successfully')
                    );
                    setSelectedHook(null);
                  } catch (error) {
                    console.error('Error deleting hook:', error);
                    toast.error(t('productKnowledge.hooks.toast.deleteError', 'Error deleting hook'));
                  } finally {
                    setDeletingHookId(null);
                  }
                }}
                disabled={isUpdatingHook || isDeletingHook || deletingHookId === selectedHook.id}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledge.hooks.delete', 'Delete')}
              </Button>
            </div>

            {/* Hook Name */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">
                {t('productKnowledge.hooks.detail.name', 'Hook Name')}
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{selectedHook.name}</p>
              </div>
            </div>

            {/* Hook Description */}
            {selectedHook.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('productKnowledge.hooks.detail.description', 'Description')}
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p
                    className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {selectedHook.description}
                  </p>
                </div>
              </div>
            )}

            {/* Hook Content */}
            {selectedHook.hook_content && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('productKnowledge.hooks.detail.content', 'Hook Content')}
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p
                    className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {selectedHook.hook_content}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                {selectedHook.created_at && (
                  <div>
                    {t('productKnowledge.hooks.detail.createdAt', 'Created')}:{' '}
                    {new Date(selectedHook.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                {selectedHook.updated_at && selectedHook.updated_at !== selectedHook.created_at && (
                  <div>
                    {t('productKnowledge.hooks.detail.updatedAt', 'Updated')}:{' '}
                    {new Date(selectedHook.updated_at).toLocaleDateString('id-ID', {
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
          /* Hooks List View */
          <>
            {isHooksLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingDots />
              </div>
            ) : filteredHooksData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Link2 className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  {hooksSearchTerm
                    ? t('productKnowledge.hooks.sidebar.noResults', 'No results found')
                    : t('productKnowledge.hooks.sidebar.noData', 'No hooks available')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredHooksData.map((hook) => (
                  <div
                    key={hook.id}
                    onClick={() => handleHookClick(hook.id)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-colors border',
                      selectedHook?.id === hook.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            'font-medium text-sm line-clamp-2',
                            selectedHook?.id === hook.id ? 'text-blue-900' : 'text-gray-900'
                          )}
                        >
                          {hook.name}
                        </h3>
                        {hook.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{hook.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditHook(hook, e)}
                          className={cn(
                            'p-1.5 rounded hover:bg-gray-200 transition-colors',
                            selectedHook?.id === hook.id ? 'text-blue-700' : 'text-gray-600'
                          )}
                          title={t('productKnowledge.hooks.edit', 'Edit hook')}
                          disabled={isUpdatingHook || isDeletingHook}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteHook(hook.id, e)}
                          className={cn(
                            'p-1.5 rounded hover:bg-red-100 transition-colors',
                            selectedHook?.id === hook.id ? 'text-red-700' : 'text-red-600',
                            deletingHookId === hook.id && 'opacity-50 cursor-not-allowed'
                          )}
                          title={t('productKnowledge.hooks.delete', 'Delete hook')}
                          disabled={isUpdatingHook || isDeletingHook || deletingHookId === hook.id}
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
        )
        ) : activeTab === 'knowledge' ? (
          selectedDetail ? (
          /* Detail View */
          <div className="p-4 space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingDetail(selectedDetail);
                  setIsModalOpen(true);
                }}
                disabled={isUpdatingDetail || isDeletingDetail}
                className="h-8 px-3"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledgeDetail.edit', 'Edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteDetail(selectedDetail.id, { stopPropagation: () => {} } as React.MouseEvent)}
                disabled={isUpdatingDetail || isDeletingDetail || deletingDetailId === selectedDetail.id}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t('productKnowledgeDetail.delete', 'Delete')}
              </Button>
            </div>

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
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('productKnowledge.detail.content', 'Product Knowledge Content')}
                </h3>
                {selectedDetail.product_knowledge_content && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(selectedDetail.product_knowledge_content)}
                    className="h-7 px-2 text-xs"
                    title={t('productKnowledgeDetail.copy', 'Copy content')}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {t('productKnowledgeDetail.copy', 'Copy')}
                  </Button>
                )}
              </div>
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
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={cn(
                            'font-medium text-sm line-clamp-2 flex-1',
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          )}
                        >
                          {getProductServiceName(item) !== 'N/A'
                            ? getProductServiceName(item)
                            : t('productKnowledge.sidebar.unnamed', 'Unnamed')}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleEditDetail(item, e)}
                            className={cn(
                              'p-1.5 rounded hover:bg-gray-200 transition-colors',
                              isSelected ? 'text-blue-700' : 'text-gray-600'
                            )}
                            title={t('productKnowledgeDetail.edit', 'Edit product knowledge detail')}
                            disabled={isUpdatingDetail || isDeletingDetail}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDetail(item.id, e)}
                            className={cn(
                              'p-1.5 rounded hover:bg-red-100 transition-colors',
                              isSelected ? 'text-red-700' : 'text-red-600',
                              deletingDetailId === item.id && 'opacity-50 cursor-not-allowed'
                            )}
                            title={t('productKnowledgeDetail.delete', 'Delete product knowledge detail')}
                            disabled={isUpdatingDetail || isDeletingDetail || deletingDetailId === item.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
        totalItems={
          activeTab === 'knowledge'
            ? filteredData.length
            : activeTab === 'style'
              ? filteredStyleData.length
              : filteredHooksData.length
        }
      />

      {/* Modals */}
      <ProductKnowledgeDetailModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingDetail(null);
          }
        }}
        onSave={handleSaveDetail}
        isLoading={isCreating || isUpdatingDetail}
        initialData={editingDetail}
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
      <HooksModal
        open={isHooksModalOpen}
        onOpenChange={(open) => {
          setIsHooksModalOpen(open);
          if (!open) {
            setEditingHook(null);
          }
        }}
        onSave={handleSaveHook}
        isLoading={isCreatingHook || isUpdatingHook}
        initialData={editingHook}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('productKnowledgeDetail.deleteTitle', 'Delete Product Knowledge Detail')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('productKnowledgeDetail.deleteConfirm', 'Are you sure you want to delete this product knowledge detail? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPendingDeleteDetailId(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDetail}
              disabled={isDeletingDetail}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeletingDetail
                ? t('common.deleting', 'Deleting...')
                : t('productKnowledgeDetail.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

