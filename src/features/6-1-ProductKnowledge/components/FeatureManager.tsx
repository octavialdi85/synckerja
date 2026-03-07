import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { MoreVertical, Plus, Edit, Trash2, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import type { ProductKnowledge } from '../hooks/useProductKnowledge';
import type { ProductKnowledgeFeature } from '../hooks/useProductKnowledgeFeatures';
import { useProductKnowledgeFeaturesMutations } from '../hooks/useProductKnowledgeFeatures';

function formatCompetitiveAdvantage(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(Boolean).join('\n\n');
  return String(value);
}

function parseCompetitiveAdvantage(value: string): any {
  if (!value || !value.trim()) return null;
  const lines = value.split(/\n\n+/).map((p) => p.replace(/\s+$/, '')).filter((p) => p.trim().length > 0);
  return lines.length > 0 ? lines : null;
}

interface FeatureManagerProps {
  masterFeatures: ProductKnowledgeFeature[];
  allProductKnowledgeRows: ProductKnowledge[];
  onDataChange: () => void;
  onMasterFeatureUpdated?: (featureId: string, payload: { feature_name: string; feature_description: string | null; solution: string | null; competitive_advantage: unknown }) => void;
}

export const FeatureManager: React.FC<FeatureManagerProps> = ({
  masterFeatures,
  allProductKnowledgeRows = [],
  onDataChange,
  onMasterFeatureUpdated,
}) => {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const { createFeature, updateFeature, deleteFeature, isCreating, isUpdating } = useProductKnowledgeFeaturesMutations();

  const [isOpen, setIsOpen] = useState(false);
  const [featureSearchTerm, setFeatureSearchTerm] = useState('');

  const filteredFeatures = useMemo(() => {
    const term = featureSearchTerm.trim().toLowerCase();
    if (!term) return masterFeatures;
    return masterFeatures.filter((f) => {
      const name = (f.feature_name || '').toLowerCase();
      const desc = (f.feature_description || '').toLowerCase();
      return name.includes(term) || desc.includes(term);
    });
  }, [masterFeatures, featureSearchTerm]);

  const [modalData, setModalData] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    item: ProductKnowledgeFeature | null;
    feature_name: string;
    feature_description: string;
    solution: string;
    competitive_advantage_raw: string;
  }>({
    open: false,
    mode: 'add',
    item: null,
    feature_name: '',
    feature_description: '',
    solution: '',
    competitive_advantage_raw: '',
  });

  const handleAdd = useCallback(() => {
    setModalData({
      open: true,
      mode: 'add',
      item: null,
      feature_name: '',
      feature_description: '',
      solution: '',
      competitive_advantage_raw: '',
    });
    setIsOpen(false);
  }, []);

  const handleEdit = useCallback((item: ProductKnowledgeFeature) => {
    setModalData({
      open: true,
      mode: 'edit',
      item,
      feature_name: item.feature_name || '',
      feature_description: item.feature_description || '',
      solution: item.solution || '',
      competitive_advantage_raw: formatCompetitiveAdvantage(item.competitive_advantage),
    });
    setIsOpen(false);
  }, []);

  const handleDelete = useCallback(
    async (item: ProductKnowledgeFeature) => {
      const refCount = allProductKnowledgeRows.filter((row) => row.feature_id === item.id).length;
      if (refCount > 0) {
        toast.error(
          t('productKnowledge.masterData.cannotDeleteFeatureInUse', 'This feature is used by {{count}} row(s). Cannot delete.', {
            count: refCount,
          })
        );
        setIsOpen(false);
        return;
      }
      const msg = t('productKnowledge.masterData.deleteFeatureConfirm', 'Are you sure you want to delete "{{name}}"?' , { name: item.feature_name || '' });
      if (window.confirm(msg)) {
        await deleteFeature(item.id);
        queryClient.invalidateQueries({ queryKey: ['product-knowledge-features'] });
        onDataChange();
      }
      setIsOpen(false);
    },
    [allProductKnowledgeRows, deleteFeature, queryClient, onDataChange, t]
  );

  const handleSave = useCallback(async () => {
    const { feature_name, feature_description, solution, competitive_advantage_raw } = modalData;
    if (!feature_name.trim()) {
      return;
    }
    const competitive_advantage = parseCompetitiveAdvantage(competitive_advantage_raw);

    if (modalData.mode === 'add') {
      await createFeature({
        feature_name: feature_name.trim(),
        feature_description: feature_description.trim() || null,
        solution: solution.trim() || null,
        competitive_advantage,
      });
    } else if (modalData.item) {
      await updateFeature({
        id: modalData.item.id,
        input: {
          feature_name: feature_name.trim(),
          feature_description: feature_description.trim() || null,
          solution: solution.trim() || null,
          competitive_advantage,
        },
      });
      // Sync ke tabel utama: update semua baris product_knowledge yang pakai feature ini
      onMasterFeatureUpdated?.(modalData.item.id, {
        feature_name: feature_name.trim(),
        feature_description: feature_description.trim() || null,
        solution: solution.trim() || null,
        competitive_advantage,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['product-knowledge-features'] });
    onDataChange();
    setModalData((prev) => ({ ...prev, open: false }));
  }, [modalData, createFeature, updateFeature, queryClient, onDataChange, onMasterFeatureUpdated]);

  const handleCloseModal = useCallback(() => {
    setModalData((prev) => ({ ...prev, open: false }));
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setFeatureSearchTerm('');
  }, []);

  const loading = isCreating || isUpdating;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 bg-white border shadow-lg z-[1000001] p-0 flex flex-col">
          <div className="sticky top-0 bg-white z-10 border-b">
            <DropdownMenuItem onClick={handleAdd} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              {t('productKnowledge.masterData.addFeature', 'Add Feature')}
            </DropdownMenuItem>
            {masterFeatures.length > 0 && (
              <div className="px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    type="text"
                    value={featureSearchTerm}
                    onChange={(e) => setFeatureSearchTerm(e.target.value)}
                    placeholder={t('productKnowledge.masterData.searchFeaturePlaceholder', 'Cari feature...')}
                    className="h-8 pl-7 pr-2 text-xs border-gray-200"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="overflow-y-auto seamless-scroll max-h-[14rem]">
            {filteredFeatures.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs font-medium text-gray-500">Features</div>
                {filteredFeatures.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50">
                    <span className="text-sm truncate flex-1 mr-2">{item.feature_name || '-'}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                        onClick={() => handleEdit(item)}
                        title={t('productKnowledge.masterData.editFeature', 'Edit')}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        onClick={() => handleDelete(item)}
                        title={t('productKnowledge.masterData.deleteFeature', 'Delete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {filteredFeatures.length === 0 && (
              <div className="px-2 py-2 text-xs text-gray-500 text-center italic">
                {masterFeatures.length === 0
                  ? t('productKnowledge.masterData.noFeaturesYet', 'No features yet')
                  : t('productKnowledge.masterData.noMatchingFeatures', 'Tidak ada feature yang cocok')}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {modalData.open &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg flex flex-col shadow-2xl w-[min(36rem,90vw)] h-[min(36rem,90vh)] max-h-[90vh] overflow-hidden">
              <h3 className="text-lg font-semibold flex-shrink-0 px-6 pt-6 pb-2">
                {modalData.mode === 'add'
                  ? t('productKnowledge.masterData.addFeature', 'Add Feature')
                  : t('productKnowledge.masterData.editFeature', 'Edit Feature')}
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain px-6 py-2">
                <div className="space-y-4 pb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('productKnowledge.masterData.featureName', 'Feature name')} *
                    </label>
                    <input
                      type="text"
                      value={modalData.feature_name}
                      onChange={(e) => setModalData((prev) => ({ ...prev, feature_name: e.target.value }))}
                      className="w-full p-2 border rounded text-sm"
                      placeholder={t('productKnowledge.masterData.featureNamePlaceholder', 'Enter feature name')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('productKnowledge.masterData.featureDescription', 'Feature description')}
                    </label>
                    <textarea
                      value={modalData.feature_description}
                      onChange={(e) => setModalData((prev) => ({ ...prev, feature_description: e.target.value }))}
                      className="w-full p-2 border rounded text-sm resize-y min-h-[4.5rem]"
                      rows={4}
                      placeholder={t('productKnowledge.masterData.featureDescriptionPlaceholder', 'Enter feature description')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('productKnowledge.masterData.solution', 'Solution')}
                    </label>
                    <textarea
                      value={modalData.solution}
                      onChange={(e) => setModalData((prev) => ({ ...prev, solution: e.target.value }))}
                      className="w-full p-2 border rounded text-sm resize-y min-h-[4.5rem]"
                      rows={5}
                      placeholder={t('productKnowledge.masterData.solutionPlaceholder', 'Enter solution')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('productKnowledge.masterData.competitiveAdvantage', 'Competitive advantage')}
                    </label>
                    <textarea
                      value={modalData.competitive_advantage_raw}
                      onChange={(e) => setModalData((prev) => ({ ...prev, competitive_advantage_raw: e.target.value }))}
                      className="w-full p-2 border rounded text-sm resize-y min-h-[4.5rem]"
                      rows={5}
                      placeholder={t('productKnowledge.masterData.competitiveAdvantagePlaceholder', 'One per line or paragraph')}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50/80">
                <Button variant="outline" onClick={handleCloseModal} disabled={loading}>
                  {t('productKnowledge.masterData.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleSave} disabled={loading || !modalData.feature_name.trim()}>
                  {loading ? t('productKnowledge.masterData.saving', 'Saving...') : t('productKnowledge.masterData.save', 'Save')}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
