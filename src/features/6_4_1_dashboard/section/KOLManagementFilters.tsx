import { Search, RefreshCw, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export interface KOLManagementFiltersType {
  search: string;
  category: string;
  platform: string;
  status: string;
  performance: string;
}

interface KOLManagementFiltersProps {
  filters: KOLManagementFiltersType;
  onFilterChange: (key: keyof KOLManagementFiltersType, value: string) => void;
  onClearFilters: () => void;
  onAddKOL: () => void;
}

export const KOLManagementFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  onAddKOL
}: KOLManagementFiltersProps) => {
  const { t } = useAppTranslation();
  
  const hasActiveFilters = 
    filters.search ||
    filters.category !== 'all' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.performance !== 'all';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input - Smaller size */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder={t('kolManagement.filters.searchPlaceholder', 'Search KOLs...')}
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => onFilterChange('category', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolManagement.filters.category', 'Category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolManagement.filters.allCategories', 'All Categories')}</SelectItem>
            <SelectItem value="fashion">{t('kolManagement.filters.categoryFashion', 'Fashion')}</SelectItem>
            <SelectItem value="beauty">{t('kolManagement.filters.categoryBeauty', 'Beauty')}</SelectItem>
            <SelectItem value="food">{t('kolManagement.filters.categoryFood', 'Food & Beverage')}</SelectItem>
            <SelectItem value="lifestyle">{t('kolManagement.filters.categoryLifestyle', 'Lifestyle')}</SelectItem>
            <SelectItem value="tech">{t('kolManagement.filters.categoryTech', 'Technology')}</SelectItem>
            <SelectItem value="travel">{t('kolManagement.filters.categoryTravel', 'Travel')}</SelectItem>
            <SelectItem value="fitness">{t('kolManagement.filters.categoryFitness', 'Fitness')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Platform Filter */}
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) => onFilterChange('platform', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolManagement.filters.platform', 'Platform')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolManagement.filters.allPlatforms', 'All Platforms')}</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolManagement.filters.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolManagement.filters.allStatus', 'All Status')}</SelectItem>
            <SelectItem value="active">{t('kolManagement.filters.statusActive', 'Active')}</SelectItem>
            <SelectItem value="inactive">{t('kolManagement.filters.statusInactive', 'Inactive')}</SelectItem>
            <SelectItem value="blacklisted">{t('kolManagement.filters.statusBlacklisted', 'Blacklisted')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Performance Filter */}
        <Select
          value={filters.performance || 'all'}
          onValueChange={(value) => onFilterChange('performance', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolManagement.filters.performance', 'Performance')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolManagement.filters.allPerformance', 'All Performance')}</SelectItem>
            <SelectItem value="high">{t('kolManagement.filters.performanceHigh', 'High (5%+)')}</SelectItem>
            <SelectItem value="medium">{t('kolManagement.filters.performanceMedium', 'Medium (2-5%)')}</SelectItem>
            <SelectItem value="low">{t('kolManagement.filters.performanceLow', 'Low (<2%)')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        <button
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className={`h-9 px-3 rounded-md transition-colors border border-gray-300 flex items-center justify-center ${
            hasActiveFilters 
              ? 'hover:bg-gray-100 cursor-pointer' 
              : 'opacity-50 cursor-not-allowed'
          }`}
          title={t('kolManagement.filters.clearAll', 'Clear all filters')}
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* Add KOL Button - Positioned in filter section */}
        <Button
          onClick={onAddKOL}
          className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('kolManagement.filters.addKOL', 'Add KOL')}
        </Button>
      </div>
    </div>
  );
};
