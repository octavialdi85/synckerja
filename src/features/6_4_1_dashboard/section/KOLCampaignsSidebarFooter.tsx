import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface KOLCampaignsSidebarFooterProps {
  totalCampaigns: number;
  activeCampaigns: number;
  selectedStatus?: string;
}

export const KOLCampaignsSidebarFooter = ({ 
  totalCampaigns, 
  activeCampaigns,
  selectedStatus 
}: KOLCampaignsSidebarFooterProps) => {
  const { t } = useAppTranslation();
  const statusText = selectedStatus && selectedStatus !== 'all' 
    ? ` ${t('kolCampaigns.sidebar.footer.inStatus', 'in')} ${selectedStatus}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('kolCampaigns.sidebar.footer.active', 'Active')}: {activeCampaigns}{statusText}
        </span>
        <span className="text-xs text-gray-400">
          {t('kolCampaigns.sidebar.footer.total', 'Total')}: {totalCampaigns} {t('kolCampaigns.sidebar.footer.campaigns', 'campaigns')}
        </span>
      </div>
    </div>
  );
};
