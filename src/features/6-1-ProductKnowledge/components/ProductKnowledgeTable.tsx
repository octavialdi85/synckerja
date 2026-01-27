import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
import { Checkbox } from '@/features/ui/checkbox';
import { Input } from '@/features/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/features/ui/dialog';
import { Textarea } from '@/features/ui/textarea';
import { Button } from '@/features/ui/button';
import { ProductKnowledge } from '../hooks/useProductKnowledge';
import { LoadingDots } from '@/components/LoadingDots';
import { Service } from '../hooks/useServices';
import { SubService } from '../hooks/useSubServices';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface ProductKnowledgeTableProps {
  data: ProductKnowledge[];
  isLoading?: boolean;
  selectedItems: string[];
  onSelectItem: (id: string, checked: boolean) => void;
  onFieldChange: (id: string, field: string, value: any) => void;
  services: Service[];
  subServices: SubService[];
}

export const ProductKnowledgeTable: React.FC<ProductKnowledgeTableProps> = ({
  data,
  isLoading = false,
  selectedItems,
  onSelectItem,
  onFieldChange,
  services = [],
  subServices = [],
}) => {
  const { t } = useAppTranslation();

  // Format problems array to display
  const formatProblems = (problems: string[] | null | undefined): string => {
    if (!problems || problems.length === 0) return '';
    // Format dengan newline dan baris kosong di antara setiap masalah untuk pemisahan visual
    // Pertahankan spasi di tengah baris
    return problems.filter(Boolean).join('\n\n');
  };

  // Get Product/Service name
  const getProductServiceName = (item: ProductKnowledge): string => {
    if (item.sub_service_name) {
      return `${item.service_name || 'N/A'} / ${item.sub_service_name}`;
    }
    if (item.service_name) {
      return item.service_name;
    }
    return '';
  };

  return (
    <div className="w-full max-w-full">
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto seamless-scroll">
          <table className="border-collapse" style={{ minWidth: '3888px', width: '100%' }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }} className="px-2 py-2 text-center border-r border-gray-200 border-b-2 border-gray-300">
                  <Checkbox 
                    checked={data.length > 0 && selectedItems.length === data.length && data.length > 0}
                    onCheckedChange={(checked) => {
                      if (data.length > 0) {
                        data.forEach(item => {
                          onSelectItem(item.id, !!checked);
                        });
                      }
                    }}
                  />
                </th>
                <th style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.productService', 'Product/Service')}
                </th>
                <th style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.subService', 'Sub Service')}
                </th>
                <th style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.targetMarket', 'Target Market')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.problem', 'Problem')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.impact', 'Impact')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.wants', 'Wants')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.needs', 'Needs')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.hiddenNeeds', 'Hidden Needs')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.falseBelief', 'False Belief')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.falseBeliefImpact', 'False Belief Impact')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.whatMakesThemStop', 'What Makes Them Stop?')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.solution', 'Solution')}
                </th>
                <th style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.feature', 'Feature')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.featureDescription', 'Feature Description')}
                </th>
                <th style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.competitiveAdvantage', 'Competitive Advantage')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={16} className="text-center py-8 border-b border-gray-200">
                    <LoadingDots />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-8 border-b border-gray-200">
                    <p className="text-gray-500 text-sm">{t('productKnowledge.table.emptyState', 'No product knowledge found')}</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <ProductKnowledgeRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    onSelectItem={onSelectItem}
                    onFieldChange={onFieldChange}
                    getProductServiceName={getProductServiceName}
                    formatProblems={formatProblems}
                    services={services}
                    subServices={subServices}
                    allProductKnowledge={data}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface ProductKnowledgeRowProps {
  item: ProductKnowledge;
  isSelected: boolean;
  onSelectItem: (id: string, checked: boolean) => void;
  onFieldChange: (id: string, field: string, value: any) => void;
  getProductServiceName: (item: ProductKnowledge) => string;
  formatProblems: (problems: string[] | null | undefined) => string;
  services: Service[];
  subServices: SubService[];
  allProductKnowledge: ProductKnowledge[]; // Add this to check for duplicates
}

const ProductKnowledgeRow: React.FC<ProductKnowledgeRowProps> = ({
  item,
  isSelected,
  onSelectItem,
  onFieldChange,
  getProductServiceName,
  formatProblems,
  services,
  subServices,
  allProductKnowledge,
}) => {
  const { t } = useAppTranslation();
  const [isEditingFeatureName, setIsEditingFeatureName] = useState(false);
  const [isEditingFeatureDescription, setIsEditingFeatureDescription] = useState(false);
  const [isEditingTargetMarket, setIsEditingTargetMarket] = useState(false);
  const [isEditingProblems, setIsEditingProblems] = useState(false);
  const [isEditingImpact, setIsEditingImpact] = useState(false);
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [isEditingWants, setIsEditingWants] = useState(false);
  const [isEditingNeeds, setIsEditingNeeds] = useState(false);
  const [isEditingHiddenNeeds, setIsEditingHiddenNeeds] = useState(false);
  const [isEditingFalseBelief, setIsEditingFalseBelief] = useState(false);
  const [isEditingFalseBeliefImpact, setIsEditingFalseBeliefImpact] = useState(false);
  const [isEditingWhatMakesThemStop, setIsEditingWhatMakesThemStop] = useState(false);
  const [isEditingCompetitiveAdvantage, setIsEditingCompetitiveAdvantage] = useState(false);
  
  // Popup state untuk view dan edit konten lengkap
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    field: string | null;
    title: string;
    content: string;
    editedContent: string;
  }>({
    isOpen: false,
    field: null,
    title: '',
    content: '',
    editedContent: '',
  });

  const handleCheckboxChange = (checked: boolean) => {
    onSelectItem(item.id, checked);
  };

  // Helper function untuk membuka popup view/edit
  const openViewPopup = (field: string, title: string, content: string) => {
    // Format content berdasarkan field type
    let formattedContent = '';
    
    if (field === 'problems') {
      formattedContent = formatProblems(item.problems_solved);
    } else if (field === 'competitiveAdvantage') {
      formattedContent = formatCompetitiveAdvantage(item.competitive_advantage);
    } else if (field === 'targetMarket') {
      formattedContent = formatTargetMarket(item.target_audience);
    } else {
      formattedContent = content || '';
    }
    
    setPopupState({
      isOpen: true,
      field,
      title,
      content: formattedContent,
      editedContent: formattedContent,
    });
  };

  // Format content untuk display di popup dengan paragraf
  const formatContentForPopup = (content: string): string => {
    if (!content || content.trim() === '') return '';
    // Jika content mengandung double newline, split menjadi paragraf
    if (content.includes('\n\n')) {
      return content.split(/\n\n+/).filter(Boolean).join('\n\n');
    }
    return content;
  };

  // Handler untuk save dari popup
  const handlePopupSave = () => {
    if (!popupState.field) return;

    const field = popupState.field;
    const newValue = popupState.editedContent.trim();

    // Panggil handler yang sesuai berdasarkan field
    switch (field) {
      case 'targetMarket':
        handleTargetMarketBlur(newValue);
        break;
      case 'problems':
        handleProblemsBlur(newValue);
        break;
      case 'impact':
        handleImpactBlur(newValue);
        break;
      case 'wants':
        handleWantsBlur(newValue);
        break;
      case 'needs':
        handleNeedsBlur(newValue);
        break;
      case 'hiddenNeeds':
        handleHiddenNeedsBlur(newValue);
        break;
      case 'falseBelief':
        handleFalseBeliefBlur(newValue);
        break;
      case 'falseBeliefImpact':
        handleFalseBeliefImpactBlur(newValue);
        break;
      case 'whatMakesThemStop':
        handleWhatMakesThemStopBlur(newValue);
        break;
      case 'solution':
        handleSolutionBlur(newValue);
        break;
      case 'feature':
        handleFeatureNameBlur(newValue);
        break;
      case 'featureDescription':
        handleFeatureDescriptionBlur(newValue);
        break;
      case 'competitiveAdvantage':
        handleCompetitiveAdvantageBlur(newValue);
        break;
    }

    setPopupState({ ...popupState, isOpen: false });
  };

  // Handler untuk cancel dari popup
  const handlePopupCancel = () => {
    setPopupState({ ...popupState, isOpen: false, editedContent: popupState.content });
  };

  const handleFeatureNameBlur = (value: string) => {
    if (value !== item.feature_name) {
      onFieldChange(item.id, 'feature_name', value);
    }
    setIsEditingFeatureName(false);
  };

  const handleFeatureDescriptionBlur = (value: string) => {
    if (value !== item.feature_description) {
      onFieldChange(item.id, 'feature_description', value);
    }
    setIsEditingFeatureDescription(false);
  };

  // Format target_audience (JSONB) to string
  const formatTargetMarket = (targetAudience: any): string => {
    if (!targetAudience) return '';
    if (typeof targetAudience === 'string') return targetAudience;
    if (typeof targetAudience === 'object') {
      return JSON.stringify(targetAudience);
    }
    return String(targetAudience);
  };

  // Parse target market string to JSONB
  const parseTargetMarket = (value: string): any => {
    if (!value || value.trim() === '') return null;
    try {
      return JSON.parse(value);
    } catch {
      // If not valid JSON, return as string
      return value;
    }
  };

  // Helper function to normalize target_audience for comparison
  const normalizeTargetAudience = (targetAudience: any): string => {
    if (!targetAudience) return '';
    if (typeof targetAudience === 'string') return targetAudience.trim().toLowerCase();
    if (typeof targetAudience === 'object') {
      try {
        return JSON.stringify(targetAudience).toLowerCase();
      } catch {
        return String(targetAudience).toLowerCase();
      }
    }
    return String(targetAudience).toLowerCase();
  };

  const handleTargetMarketBlur = (value: string) => {
    const parsed = parseTargetMarket(value);
    const normalizedNewValue = normalizeTargetAudience(parsed);
    
    // Check for duplicates (excluding current item)
    const hasDuplicate = allProductKnowledge.some((pk) => {
      if (pk.id === item.id) return false; // Skip current item
      const normalizedExisting = normalizeTargetAudience(pk.target_audience);
      return normalizedExisting !== '' && normalizedExisting === normalizedNewValue;
    });
    
    if (hasDuplicate) {
      alert('Target Market (Customer Persona) ini sudah digunakan di baris lain. Harap gunakan nilai yang berbeda untuk memastikan setiap Customer Persona unik.');
      setIsEditingTargetMarket(false);
      return;
    }
    
    if (JSON.stringify(parsed) !== JSON.stringify(item.target_audience)) {
      onFieldChange(item.id, 'target_audience', parsed);
    }
    setIsEditingTargetMarket(false);
  };

  const handleProblemsBlur = (value: string) => {
    // Parse string dengan double newline (\n\n) sebagai pemisah utama antar masalah
    // Jika tidak ada double newline, gunakan single newline sebagai fallback
    // Pertahankan spasi di dalam setiap baris, termasuk indentasi di awal
    // Hanya hapus trailing whitespace (spasi di akhir baris)
    
    let problemsArray: string[] = [];
    
    // Coba split berdasarkan double newline terlebih dahulu
    if (value.includes('\n\n')) {
      problemsArray = value
        .split(/\n\n+/)
        .map(p => p.replace(/\s+$/, '')) // Hapus trailing whitespace saja
        .filter(p => p.trim().length > 0); // Hanya filter yang benar-benar kosong
    } else {
      // Fallback: split berdasarkan single newline dan kelompokkan
      // Baris kosong bertindak sebagai pemisah
      const lines = value.split(/\n/).map(p => p.replace(/\s+$/, ''));
      let currentProblem: string[] = [];
      
      for (const line of lines) {
        if (line.trim().length > 0) {
          currentProblem.push(line);
        } else if (currentProblem.length > 0) {
          problemsArray.push(currentProblem.join('\n'));
          currentProblem = [];
        }
      }
      
      if (currentProblem.length > 0) {
        problemsArray.push(currentProblem.join('\n'));
      }
    }
    
    if (JSON.stringify(problemsArray) !== JSON.stringify(item.problems_solved || [])) {
      onFieldChange(item.id, 'problems_solved', problemsArray);
    }
    setIsEditingProblems(false);
  };

  const handleImpactBlur = (value: string) => {
    if (value !== item.impact) {
      onFieldChange(item.id, 'impact', value);
    }
    setIsEditingImpact(false);
  };

  const handleSolutionBlur = (value: string) => {
    if (value !== item.solusi) {
      onFieldChange(item.id, 'solusi', value);
    }
    setIsEditingSolution(false);
  };

  const handleWantsBlur = (value: string) => {
    if (value !== (item.wants || '')) {
      onFieldChange(item.id, 'wants', value);
    }
    setIsEditingWants(false);
  };

  const handleNeedsBlur = (value: string) => {
    if (value !== (item.needs || '')) {
      onFieldChange(item.id, 'needs', value);
    }
    setIsEditingNeeds(false);
  };

  const handleHiddenNeedsBlur = (value: string) => {
    if (value !== (item.hidden_needs || '')) {
      onFieldChange(item.id, 'hidden_needs', value);
    }
    setIsEditingHiddenNeeds(false);
  };

  const handleFalseBeliefBlur = (value: string) => {
    if (value !== (item.false_belief || '')) {
      onFieldChange(item.id, 'false_belief', value);
    }
    setIsEditingFalseBelief(false);
  };

  const handleFalseBeliefImpactBlur = (value: string) => {
    if (value !== (item.false_belief_impact || '')) {
      onFieldChange(item.id, 'false_belief_impact', value);
    }
    setIsEditingFalseBeliefImpact(false);
  };

  const handleWhatMakesThemStopBlur = (value: string) => {
    if (value !== (item.what_makes_them_stop || '')) {
      onFieldChange(item.id, 'what_makes_them_stop', value);
    }
    setIsEditingWhatMakesThemStop(false);
  };

  // Format competitive_advantage (JSONB) to string
  const formatCompetitiveAdvantage = (competitiveAdvantage: any): string => {
    if (!competitiveAdvantage) return '';
    if (typeof competitiveAdvantage === 'string') return competitiveAdvantage;
    if (Array.isArray(competitiveAdvantage)) {
      // Format dengan newline dan baris kosong di antara setiap advantage untuk pemisahan visual
      // Pertahankan spasi di tengah baris
      return competitiveAdvantage.filter(Boolean).join('\n\n');
    }
    if (typeof competitiveAdvantage === 'object') {
      return JSON.stringify(competitiveAdvantage);
    }
    return String(competitiveAdvantage);
  };

  // Parse competitive advantage string to JSONB
  const parseCompetitiveAdvantage = (value: string): any => {
    if (!value || value.trim() === '') return null;
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not valid JSON, treat as newline-separated array (seperti Problem)
      // Parse string dengan double newline (\n\n) sebagai pemisah utama antar advantage
      // Jika tidak ada double newline, gunakan single newline sebagai fallback
      // Pertahankan spasi di dalam setiap baris, termasuk indentasi di awal
      // Hanya hapus trailing whitespace (spasi di akhir baris)
      
      let items: string[] = [];
      
      // Coba split berdasarkan double newline terlebih dahulu
      if (value.includes('\n\n')) {
        items = value
          .split(/\n\n+/)
          .map(p => p.replace(/\s+$/, '')) // Hapus trailing whitespace saja
          .filter(p => p.trim().length > 0); // Hanya filter yang benar-benar kosong
      } else {
        // Fallback: split berdasarkan single newline dan kelompokkan
        // Baris kosong bertindak sebagai pemisah
        const lines = value.split(/\n/).map(p => p.replace(/\s+$/, ''));
        let currentItem: string[] = [];
        
        for (const line of lines) {
          if (line.trim().length > 0) {
            currentItem.push(line);
          } else if (currentItem.length > 0) {
            items.push(currentItem.join('\n'));
            currentItem = [];
          }
        }
        
        if (currentItem.length > 0) {
          items.push(currentItem.join('\n'));
        }
      }
      
      return items.length > 0 ? items : null;
    }
  };

  const handleCompetitiveAdvantageBlur = (value: string) => {
    const parsed = parseCompetitiveAdvantage(value);
    const currentValue = item.competitive_advantage;
    if (JSON.stringify(parsed) !== JSON.stringify(currentValue)) {
      onFieldChange(item.id, 'competitive_advantage', parsed);
    }
    setIsEditingCompetitiveAdvantage(false);
  };

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-200">
      {/* Checkbox */}
      <td style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }} className="px-2 py-1 text-center border-r border-gray-200">
        <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
      </td>

      {/* Product/Service */}
      <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-1 border-r border-gray-200">
        <Select 
          value={item.service_id || 'placeholder'} 
          onValueChange={(value) => {
            if (value === 'placeholder') {
              onFieldChange(item.id, 'service_id', null);
              onFieldChange(item.id, 'sub_service_id', null);
            } else {
              onFieldChange(item.id, 'service_id', value);
              onFieldChange(item.id, 'sub_service_id', null);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
            <SelectValue placeholder={t('productKnowledge.table.selectService', 'Select Service')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>{t('productKnowledge.table.selectService', 'Select Service')}</SelectItem>
            {services.map(service => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Sub Service */}
      <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-1 border-r border-gray-200">
        <Select 
          value={item.sub_service_id || 'placeholder'} 
          onValueChange={(value) => {
            if (value === 'placeholder') {
              onFieldChange(item.id, 'sub_service_id', null);
            } else {
              onFieldChange(item.id, 'sub_service_id', value);
            }
          }}
          disabled={!item.service_id}
        >
          <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
            <SelectValue placeholder={item.service_id ? t('productKnowledge.table.selectSubService', 'Select Sub Service') : t('productKnowledge.table.selectServiceFirst', 'Select Service First')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>{t('productKnowledge.table.selectSubService', 'Select Sub Service')}</SelectItem>
            {subServices
              .filter(subService => subService.service_id === item.service_id)
              .map(subService => (
                <SelectItem key={subService.id} value={subService.id}>
                  {subService.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </td>

      {/* Target Market */}
      <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingTargetMarket ? (
          <textarea
            defaultValue={formatTargetMarket(item.target_audience)}
            onBlur={(e) => handleTargetMarketBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingTargetMarket(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('targetMarket', t('productKnowledge.table.headers.targetMarket', 'Target Market'), formatTargetMarket(item.target_audience))}
            onDoubleClick={() => setIsEditingTargetMarket(true)}
            title={formatTargetMarket(item.target_audience) || '-'}
          >
            {formatTargetMarket(item.target_audience) || '-'}
          </div>
        )}
      </td>

      {/* Problem */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingProblems ? (
          <textarea
            defaultValue={formatProblems(item.problems_solved)}
            onBlur={(e) => handleProblemsBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingProblems(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="Masalah 1: ...&#10;Masalah 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('problems', t('productKnowledge.table.headers.problem', 'Problem'), formatProblems(item.problems_solved))}
            onDoubleClick={() => setIsEditingProblems(true)}
            title={formatProblems(item.problems_solved) || '-'}
          >
            {formatProblems(item.problems_solved) || '-'}
            {item.problem_tags && item.problem_tags.length > 0 && (
              <span className="ml-1 text-xs text-blue-600">({item.problem_tags.length} tags)</span>
            )}
          </div>
        )}
      </td>

      {/* Dampak */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingImpact ? (
          <textarea
            defaultValue={item.impact || ''}
            onBlur={(e) => handleImpactBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingImpact(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="Impact 1: ...&#10;&#10;Impact 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('impact', t('productKnowledge.table.headers.impact', 'Impact'), item.impact || '')}
            onDoubleClick={() => setIsEditingImpact(true)}
            title={item.impact || '-'}
          >
            {item.impact || '-'}
          </div>
        )}
      </td>

      {/* Wants */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingWants ? (
          <textarea
            defaultValue={item.wants || ''}
            onBlur={(e) => handleWantsBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingWants(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('wants', t('productKnowledge.table.headers.wants', 'Wants'), item.wants || '')}
            onDoubleClick={() => setIsEditingWants(true)}
            title={item.wants || '-'}
          >
            {item.wants || '-'}
          </div>
        )}
      </td>

      {/* Needs */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingNeeds ? (
          <textarea
            defaultValue={item.needs || ''}
            onBlur={(e) => handleNeedsBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingNeeds(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('needs', t('productKnowledge.table.headers.needs', 'Needs'), item.needs || '')}
            onDoubleClick={() => setIsEditingNeeds(true)}
            title={item.needs || '-'}
          >
            {item.needs || '-'}
          </div>
        )}
      </td>

      {/* Hidden Needs */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingHiddenNeeds ? (
          <textarea
            defaultValue={item.hidden_needs || ''}
            onBlur={(e) => handleHiddenNeedsBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingHiddenNeeds(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="Hidden Needs 1: ...&#10;Hidden Needs 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('hiddenNeeds', t('productKnowledge.table.headers.hiddenNeeds', 'Hidden Needs'), item.hidden_needs || '')}
            onDoubleClick={() => setIsEditingHiddenNeeds(true)}
            title={item.hidden_needs || '-'}
          >
            {item.hidden_needs || '-'}
          </div>
        )}
      </td>

      {/* False Belief */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingFalseBelief ? (
          <textarea
            defaultValue={item.false_belief || ''}
            onBlur={(e) => handleFalseBeliefBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingFalseBelief(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="False Belief 1: ...&#10;&#10;False Belief 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('falseBelief', t('productKnowledge.table.headers.falseBelief', 'False Belief'), item.false_belief || '')}
            onDoubleClick={() => setIsEditingFalseBelief(true)}
            title={item.false_belief || '-'}
          >
            {item.false_belief || '-'}
          </div>
        )}
      </td>

      {/* False Belief Impact */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingFalseBeliefImpact ? (
          <textarea
            defaultValue={item.false_belief_impact || ''}
            onBlur={(e) => handleFalseBeliefImpactBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingFalseBeliefImpact(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="False Belief Impact 1: ...&#10;&#10;False Belief Impact 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('falseBeliefImpact', t('productKnowledge.table.headers.falseBeliefImpact', 'False Belief Impact'), item.false_belief_impact || '')}
            onDoubleClick={() => setIsEditingFalseBeliefImpact(true)}
            title={item.false_belief_impact || '-'}
          >
            {item.false_belief_impact || '-'}
          </div>
        )}
      </td>

      {/* What Makes Them Stop */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingWhatMakesThemStop ? (
          <textarea
            defaultValue={item.what_makes_them_stop || ''}
            onBlur={(e) => handleWhatMakesThemStopBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingWhatMakesThemStop(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="What Makes Them Stop 1: ...&#10;&#10;What Makes Them Stop 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('whatMakesThemStop', t('productKnowledge.table.headers.whatMakesThemStop', 'What Makes Them Stop?'), item.what_makes_them_stop || '')}
            onDoubleClick={() => setIsEditingWhatMakesThemStop(true)}
            title={item.what_makes_them_stop || '-'}
          >
            {item.what_makes_them_stop || '-'}
          </div>
        )}
      </td>

      {/* Solusi */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingSolution ? (
          <textarea
            defaultValue={item.solusi || ''}
            onBlur={(e) => handleSolutionBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingSolution(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="Solution 1: ...&#10;&#10;Solution 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('solution', t('productKnowledge.table.headers.solution', 'Solution'), item.solusi || '')}
            onDoubleClick={() => setIsEditingSolution(true)}
            title={item.solusi || '-'}
          >
            {item.solusi || '-'}
          </div>
        )}
      </td>

      {/* Fitur */}
      <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingFeatureName ? (
          <Input
            defaultValue={item.feature_name || ''}
            onBlur={(e) => handleFeatureNameBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFeatureNameBlur(e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setIsEditingFeatureName(false);
              }
            }}
            autoFocus
            className="h-8 text-sm"
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('feature', t('productKnowledge.table.headers.feature', 'Feature'), item.feature_name || '')}
            onDoubleClick={() => setIsEditingFeatureName(true)}
            title={item.feature_name || '-'}
          >
            {item.feature_name || '-'}
          </div>
        )}
      </td>

      {/* Fitur Description */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingFeatureDescription ? (
          <textarea
            defaultValue={item.feature_description || ''}
            onBlur={(e) => handleFeatureDescriptionBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingFeatureDescription(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('featureDescription', t('productKnowledge.table.headers.featureDescription', 'Feature Description'), item.feature_description || '')}
            onDoubleClick={() => setIsEditingFeatureDescription(true)}
            title={item.feature_description || '-'}
          >
            {item.feature_description || '-'}
          </div>
        )}
      </td>

      {/* Competitive Advantage */}
      <td style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} className="px-2 py-1">
        {isEditingCompetitiveAdvantage ? (
          <textarea
            defaultValue={formatCompetitiveAdvantage(item.competitive_advantage)}
            onBlur={(e) => handleCompetitiveAdvantageBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingCompetitiveAdvantage(false);
              }
            }}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none whitespace-pre-wrap"
            rows={5}
            placeholder="Advantage 1: ...&#10;Advantage 2: ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] truncate"
            onClick={() => openViewPopup('competitiveAdvantage', t('productKnowledge.table.headers.competitiveAdvantage', 'Competitive Advantage'), formatCompetitiveAdvantage(item.competitive_advantage))}
            onDoubleClick={() => setIsEditingCompetitiveAdvantage(true)}
            title={formatCompetitiveAdvantage(item.competitive_advantage) || '-'}
          >
            {formatCompetitiveAdvantage(item.competitive_advantage) || '-'}
          </div>
        )}
      </td>

      {/* View/Edit Popup Dialog */}
      <Dialog open={popupState.isOpen} onOpenChange={(open) => {
        if (!open) {
          handlePopupCancel();
        } else {
          setPopupState({ ...popupState, isOpen: open });
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{popupState.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-y-auto">
            <Textarea
              value={popupState.editedContent}
              onChange={(e) => setPopupState({ ...popupState, editedContent: e.target.value })}
              className="min-h-[300px] text-sm whitespace-pre-wrap font-mono"
              placeholder="Enter content here..."
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handlePopupCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePopupSave}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
};

