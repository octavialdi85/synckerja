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
    return problems.join(', ');
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
          <table className="border-collapse" style={{ minWidth: '1768px', width: '100%' }}>
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
                  {t('productKnowledge.table.headers.feature', 'Feature')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.featureDescription', 'Feature Description')}
                </th>
                <th style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.targetMarket', 'Target Market')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.problem', 'Problem')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.impact', 'Impact')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.solution', 'Solution')}
                </th>
                <th style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300">
                  {t('productKnowledge.table.headers.competitiveAdvantage', 'Competitive Advantage')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 border-b border-gray-200">
                    <LoadingDots />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 border-b border-gray-200">
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
}) => {
  const { t } = useAppTranslation();
  const [isEditingFeatureName, setIsEditingFeatureName] = useState(false);
  const [isEditingFeatureDescription, setIsEditingFeatureDescription] = useState(false);
  const [isEditingTargetMarket, setIsEditingTargetMarket] = useState(false);
  const [isEditingProblems, setIsEditingProblems] = useState(false);
  const [isEditingImpact, setIsEditingImpact] = useState(false);
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [isEditingCompetitiveAdvantage, setIsEditingCompetitiveAdvantage] = useState(false);

  const handleCheckboxChange = (checked: boolean) => {
    onSelectItem(item.id, checked);
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

  const handleTargetMarketBlur = (value: string) => {
    const parsed = parseTargetMarket(value);
    if (JSON.stringify(parsed) !== JSON.stringify(item.target_audience)) {
      onFieldChange(item.id, 'target_audience', parsed);
    }
    setIsEditingTargetMarket(false);
  };

  const handleProblemsBlur = (value: string) => {
    const problemsArray = value.split(',').map(p => p.trim()).filter(Boolean);
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

  // Format competitive_advantage (JSONB) to string
  const formatCompetitiveAdvantage = (competitiveAdvantage: any): string => {
    if (!competitiveAdvantage) return '';
    if (typeof competitiveAdvantage === 'string') return competitiveAdvantage;
    if (Array.isArray(competitiveAdvantage)) {
      return competitiveAdvantage.join(', ');
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
      // If not valid JSON, treat as comma-separated array
      const items = value.split(',').map(item => item.trim()).filter(Boolean);
      return items.length > 0 ? items : null;
    }
  };

  const handleCompetitiveAdvantageBlur = (value: string) => {
    const parsed = parseCompetitiveAdvantage(value);
    const currentValue = item.competitive_advantage;
    const currentString = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '');
    if (parsed !== currentValue && JSON.stringify(parsed) !== JSON.stringify(currentValue)) {
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
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingFeatureName(true)}
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
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingFeatureDescription(true)}
          >
            {item.feature_description || '-'}
          </div>
        )}
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
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingTargetMarket(true)}
          >
            {formatTargetMarket(item.target_audience) || '-'}
          </div>
        )}
      </td>

      {/* Problem */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
        {isEditingProblems ? (
          <Input
            defaultValue={formatProblems(item.problems_solved)}
            onBlur={(e) => handleProblemsBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleProblemsBlur(e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setIsEditingProblems(false);
              }
            }}
            autoFocus
            className="h-8 text-sm"
            placeholder={t('productKnowledge.table.problemPlaceholder', 'Problem 1, Problem 2, ...')}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingProblems(true)}
          >
            {formatProblems(item.problems_solved) || '-'}
            {item.problem_tags && item.problem_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.problem_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </td>

      {/* Dampak */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
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
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingImpact(true)}
          >
            {item.impact || '-'}
          </div>
        )}
      </td>

      {/* Solusi */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1 border-r border-gray-200">
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
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingSolution(true)}
          >
            {item.solusi || '-'}
          </div>
        )}
      </td>

      {/* Competitive Advantage */}
      <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} className="px-2 py-1">
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
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
            placeholder="Advantage 1, Advantage 2, ..."
          />
        ) : (
          <div
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px]"
            onClick={() => setIsEditingCompetitiveAdvantage(true)}
          >
            {formatCompetitiveAdvantage(item.competitive_advantage) || '-'}
          </div>
        )}
      </td>
    </tr>
  );
};

