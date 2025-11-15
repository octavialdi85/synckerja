import { memo } from 'react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const PlansHeader = memo(() => {
  const { t } = useAppTranslation();
  
  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">{t('subscription.plans.header.title', 'Choose Subscription Package')}</h1>
        <p className="text-xs text-gray-600">
          {t('subscription.plans.header.description', 'Manage your team and organization with complete HRIS features. Choose a package that suits your company\'s needs.')}
        </p>
      </div>
    </div>
  );
});

PlansHeader.displayName = 'PlansHeader';
