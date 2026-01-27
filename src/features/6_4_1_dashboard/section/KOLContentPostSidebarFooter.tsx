import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface KOLContentPostSidebarFooterProps {
  totalPosts: number;
  postedPosts: number;
  selectedStatus?: string;
}

export const KOLContentPostSidebarFooter = ({ 
  totalPosts, 
  postedPosts, 
  selectedStatus 
}: KOLContentPostSidebarFooterProps) => {
  const { t } = useAppTranslation();
  const statusText = selectedStatus && selectedStatus !== 'all' 
    ? ` ${t('kolContentPost.sidebar.footer.inStatus', 'in')} ${selectedStatus}` 
    : '';

  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('kolContentPost.sidebar.footer.posted', 'Posted')}: {postedPosts}{statusText}
        </span>
        <span className="text-xs text-gray-400">
          {t('kolContentPost.sidebar.footer.total', 'Total')}: {totalPosts} {t('kolContentPost.sidebar.footer.posts', 'posts')}
        </span>
      </div>
    </div>
  );
};
