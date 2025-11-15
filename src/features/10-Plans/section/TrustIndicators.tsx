import { memo } from 'react';
import { Shield, Users, Zap } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const TrustIndicators = memo(() => {
  const { t } = useAppTranslation();
  
  return (
    <div className="text-center space-y-4 pt-12 border-t">
      <h3 className="text-xl font-semibold text-gray-900">{t('subscription.plans.trustIndicators.title', 'Why Choose Our HRIS?')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
        <div className="space-y-2">
          <Shield className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">{t('subscription.plans.trustIndicators.security.title', 'Guaranteed Security')}</h4>
          <p>{t('subscription.plans.trustIndicators.security.description', 'Your company data is secure with enterprise-grade encryption')}</p>
        </div>
        <div className="space-y-2">
          <Users className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">{t('subscription.plans.trustIndicators.support.title', '24/7 Support')}</h4>
          <p>{t('subscription.plans.trustIndicators.support.description', 'Our support team is ready to help whenever you need it')}</p>
        </div>
        <div className="space-y-2">
          <Zap className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">{t('subscription.plans.trustIndicators.implementation.title', 'Fast Implementation')}</h4>
          <p>{t('subscription.plans.trustIndicators.implementation.description', 'Easy and fast setup, can be used today')}</p>
        </div>
      </div>
    </div>
  );
});

TrustIndicators.displayName = 'TrustIndicators';
