import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface KOLCampaignsTableFooterProps {
  totalCampaigns: number;
  activeCampaigns: number;
  filteredCampaigns?: number;
  selectedStatus?: string;
}

export const KOLCampaignsTableFooter = ({ 
  totalCampaigns, 
  activeCampaigns, 
  filteredCampaigns = totalCampaigns,
  selectedStatus 
}: KOLCampaignsTableFooterProps) => {
  const { t } = useAppTranslation();
  const statusText = selectedStatus && selectedStatus !== 'all' 
    ? ` ${t('kolCampaigns.table.footer.inStatus', 'in')} ${selectedStatus}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('kolCampaigns.table.footer.showing', 'Showing')} {filteredCampaigns} {t('kolCampaigns.table.footer.of', 'of')} {totalCampaigns} {t('kolCampaigns.table.footer.campaigns', 'campaigns')}{statusText}
        </span>
        <span className="text-xs text-gray-400">
          {t('kolCampaigns.table.footer.total', 'Total')}: {totalCampaigns} {t('kolCampaigns.table.footer.campaigns', 'campaigns')}
        </span>
      </div>
    </div>
  );
};
