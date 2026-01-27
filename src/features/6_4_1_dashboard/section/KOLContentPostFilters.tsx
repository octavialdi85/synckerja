import { Search, RefreshCw, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export interface KOLContentPostFiltersType {
  search: string;
  campaign: string;
  platform: string;
  status: string;
  contentType: string;
}

interface KOLContentPostFiltersProps {
  filters: KOLContentPostFiltersType;
  onFilterChange: (key: keyof KOLContentPostFiltersType, value: string) => void;
  onClearFilters: () => void;
  onCreatePost: () => void;
  campaignOptions?: Array<{ id: string; name: string; kolName: string }>;
}

export const KOLContentPostFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  onCreatePost,
  campaignOptions = []
}: KOLContentPostFiltersProps) => {
  const { t } = useAppTranslation();
  
  const hasActiveFilters = 
    filters.search ||
    filters.campaign !== 'all' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.contentType !== 'all';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input - Smaller size */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder={t('kolContentPost.filters.searchPlaceholder', 'Search content posts...')}
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Campaign Filter */}
        <Select
          value={filters.campaign || 'all'}
          onValueChange={(value) => onFilterChange('campaign', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolContentPost.filters.campaign', 'Campaign')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolContentPost.filters.allCampaigns', 'All Campaigns')}</SelectItem>
            {campaignOptions.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name} - {campaign.kolName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform Filter */}
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) => onFilterChange('platform', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolContentPost.filters.platform', 'Platform')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolContentPost.filters.allPlatforms', 'All Platforms')}</SelectItem>
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
            <SelectValue placeholder={t('kolContentPost.filters.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolContentPost.filters.allStatus', 'All Status')}</SelectItem>
            <SelectItem value="draft">{t('kolContentPost.filters.statusDraft', 'Draft')}</SelectItem>
            <SelectItem value="posted">{t('kolContentPost.filters.statusPosted', 'Posted')}</SelectItem>
            <SelectItem value="archived">{t('kolContentPost.filters.statusArchived', 'Archived')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Content Type Filter */}
        <Select
          value={filters.contentType || 'all'}
          onValueChange={(value) => onFilterChange('contentType', value)}
        >
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder={t('kolContentPost.filters.contentType', 'Content Type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kolContentPost.filters.allTypes', 'All Types')}</SelectItem>
            <SelectItem value="post">{t('kolContentPost.filters.typePost', 'Post')}</SelectItem>
            <SelectItem value="story">{t('kolContentPost.filters.typeStory', 'Story')}</SelectItem>
            <SelectItem value="reel">{t('kolContentPost.filters.typeReel', 'Reel')}</SelectItem>
            <SelectItem value="video">{t('kolContentPost.filters.typeVideo', 'Video')}</SelectItem>
            <SelectItem value="live">{t('kolContentPost.filters.typeLive', 'Live')}</SelectItem>
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
          title={t('kolContentPost.filters.clearAll', 'Clear all filters')}
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* Create Content Post Button - Positioned in filter section */}
        <Button
          onClick={onCreatePost}
          className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('kolContentPost.filters.createPost', 'Create Content Post & Agreement')}
        </Button>
      </div>
    </div>
  );
};
