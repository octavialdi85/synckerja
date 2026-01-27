import { Search, RefreshCw, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export interface KOLCampaignsFiltersType {
  search: string;
  status: string;
  budget: string;
  date: string;
}

interface KOLCampaignsFiltersProps {
  filters: KOLCampaignsFiltersType;
  onFilterChange: (key: keyof KOLCampaignsFiltersType, value: string) => void;
  onClearFilters: () => void;
  onNewCampaign: () => void;
}

export const KOLCampaignsFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  onNewCampaign
}: KOLCampaignsFiltersProps) => {
  const { t } = useAppTranslation();
  
  const hasActiveFilters = 
    filters.search ||
    filters.status !== 'all' ||
    filters.budget !== 'all' ||
    filters.date !== 'all';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input - Smaller size */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder={t('kolCampaigns.filters.searchPlaceholder', 'Search campaigns...')}
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolCampaigns.filters.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolCampaigns.filters.allStatus', 'All Status')}</SelectItem>
            <SelectItem value="draft">{t('kolCampaigns.filters.statusDraft', 'Draft')}</SelectItem>
            <SelectItem value="active">{t('kolCampaigns.filters.statusActive', 'Active')}</SelectItem>
            <SelectItem value="completed">{t('kolCampaigns.filters.statusCompleted', 'Completed')}</SelectItem>
            <SelectItem value="cancelled">{t('kolCampaigns.filters.statusCancelled', 'Cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Budget Filter */}
        <Select
          value={filters.budget || 'all'}
          onValueChange={(value) => onFilterChange('budget', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolCampaigns.filters.budget', 'Budget')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolCampaigns.filters.allBudget', 'All Budget')}</SelectItem>
            <SelectItem value="low">{t('kolCampaigns.filters.budgetLow', '< $10K')}</SelectItem>
            <SelectItem value="medium">{t('kolCampaigns.filters.budgetMedium', '$10K - $50K')}</SelectItem>
            <SelectItem value="high">{t('kolCampaigns.filters.budgetHigh', '> $50K')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select
          value={filters.date || 'all'}
          onValueChange={(value) => onFilterChange('date', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolCampaigns.filters.date', 'Date')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolCampaigns.filters.allDates', 'All Dates')}</SelectItem>
            <SelectItem value="this-month">{t('kolCampaigns.filters.dateThisMonth', 'This Month')}</SelectItem>
            <SelectItem value="last-month">{t('kolCampaigns.filters.dateLastMonth', 'Last Month')}</SelectItem>
            <SelectItem value="this-quarter">{t('kolCampaigns.filters.dateThisQuarter', 'This Quarter')}</SelectItem>
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
          title={t('kolCampaigns.filters.clearAll', 'Clear all filters')}
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* New Campaign Button - Positioned in filter section */}
        <Button
          onClick={onNewCampaign}
          className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('kolCampaigns.filters.newCampaign', 'New Campaign')}
        </Button>
      </div>
    </div>
  );
};
