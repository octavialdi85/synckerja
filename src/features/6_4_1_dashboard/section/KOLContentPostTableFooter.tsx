import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface KOLContentPostTableFooterProps {
  totalPosts: number;
  postedPosts: number;
  filteredPosts?: number;
  selectedStatus?: string;
}

export const KOLContentPostTableFooter = ({
  totalPosts,
  postedPosts,
  filteredPosts = totalPosts,
  selectedStatus
}: KOLContentPostTableFooterProps) => {
  const { t } = useAppTranslation();
  const statusText = selectedStatus && selectedStatus !== 'all'
    ? ` ${t('kolContentPost.table.footer.inStatus', 'in')} ${selectedStatus}`
    : '';

  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('kolContentPost.table.footer.showing', 'Showing')} {filteredPosts} {t('kolContentPost.table.footer.of', 'of')} {totalPosts} {t('kolContentPost.table.footer.posts', 'posts')}{statusText}
        </span>
        <span className="text-xs text-gray-400">
          {t('kolContentPost.table.footer.total', 'Total')}: {totalPosts} {t('kolContentPost.table.footer.posts', 'posts')}
        </span>
      </div>
    </div>
  );
};
