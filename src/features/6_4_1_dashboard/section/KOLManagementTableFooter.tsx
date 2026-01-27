import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface KOLManagementTableFooterProps {
  totalKOLs: number;
  activeKOLs: number;
  filteredKOLs?: number;
  selectedCategory?: string;
}

export const KOLManagementTableFooter = ({ 
  totalKOLs, 
  activeKOLs, 
  filteredKOLs = totalKOLs,
  selectedCategory 
}: KOLManagementTableFooterProps) => {
  const { t } = useAppTranslation();
  
  const categoryText = selectedCategory && selectedCategory !== 'all' 
    ? ` ${t('kolManagement.table.footer.inCategory', 'in')} ${selectedCategory}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('kolManagement.table.footer.showing', 'Showing')} {filteredKOLs} {t('kolManagement.table.footer.of', 'of')} {totalKOLs} {t('kolManagement.table.footer.kols', 'KOLs')}{categoryText}
        </span>
        <span className="text-xs text-gray-400">
          {t('kolManagement.table.footer.total', 'Total')}: {totalKOLs} {t('kolManagement.table.footer.kols', 'KOLs')}
        </span>
      </div>
    </div>
  );
};
