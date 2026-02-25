import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Progress } from '@/features/ui/progress';
import { Calendar, Users, CreditCard, AlertTriangle } from 'lucide-react';
import type { SubscriptionStatus } from '@/features/10-management/hooks/useOptimizedSubscription';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface CurrentSubscriptionProps {
  subscriptionStatus: SubscriptionStatus;
  /** When set, overrides renewal/next payment date and days remaining to match Payment History */
  nextBillingOverride?: { date: Date | null; daysRemaining: number } | null;
  /** When true and no override, show loading for renewal/days (avoids wrong 58 on first paint). */
  nextBillingLoading?: boolean;
}

export const CurrentSubscription = memo(({
  subscriptionStatus,
  nextBillingOverride,
  nextBillingLoading
}: CurrentSubscriptionProps) => {
  const { t } = useAppTranslation();
  const formatDate = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const maxEmployees = subscriptionStatus.member_count || 1000;
  const employeeUsagePercentage = (subscriptionStatus.current_employees / maxEmployees) * 100;
  const isNearLimit = employeeUsagePercentage >= 80;
  
  const expiryDate = nextBillingOverride?.date
    ? nextBillingOverride.date.toISOString()
    : subscriptionStatus.is_trial 
    ? (subscriptionStatus.trial_end_date || subscriptionStatus.end_date)
    : (subscriptionStatus.subscription_end_date || subscriptionStatus.end_date);
  const daysRemaining = nextBillingOverride != null ? nextBillingOverride.daysRemaining : subscriptionStatus.days_until_expiry;
  const showNextBillingLoading = nextBillingLoading && nextBillingOverride == null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('subscription.overview.currentSubscription')}
              {subscriptionStatus.is_trial && <Badge variant="secondary">{t('subscription.overview.trial')}</Badge>}
            </CardTitle>
            <CardDescription>
              {subscriptionStatus.plan_name} {t('subscription.overview.subscription')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employee Usage */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('subscription.overview.employeeUsage')}</span>
              {isNearLimit && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{subscriptionStatus.current_employees} of {maxEmployees}</span>
                <span className={isNearLimit ? 'text-orange-600' : 'text-gray-500'}>
                  {Math.round(employeeUsagePercentage)}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${employeeUsagePercentage}%` }}
                />
              </div>
              {subscriptionStatus.over_limit && (
                <p className="text-xs text-red-600">
                  {t('subscription.overview.overLimit')}
                </p>
              )}
            </div>
          </div>

          {/* Subscription Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {subscriptionStatus.is_trial ? t('subscription.overview.trialPeriod') : t('subscription.overview.subscription')}
              </span>
            </div>
            <div className="text-sm">
              <p className="text-gray-700">
                {subscriptionStatus.is_trial ? t('subscription.overview.endsOn') : t('subscription.overview.renewsOn')} {showNextBillingLoading ? '...' : (expiryDate && formatDate(expiryDate))}
              </p>
              <p className={`text-xs ${(daysRemaining || 0) <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                {showNextBillingLoading
                  ? t('subscription.overview.loading', 'Loading...')
                  : daysRemaining < 0
                  ? t('subscription.overview.expiredDaysAgo', 'Expired X days ago', { count: Math.abs(daysRemaining) })
                  : daysRemaining === 0
                  ? t('subscription.overview.expiresToday', 'Expires today')
                  : t('subscription.overview.daysRemaining', 'X days remaining', { count: daysRemaining })
                }
              </p>
            </div>
          </div>

          {/* Billing */}
          {!subscriptionStatus.is_trial && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{t('subscription.overview.billing')}</span>
              </div>
              <div className="text-sm">
                <p className="text-gray-700 capitalize">
                  {subscriptionStatus.billing_cycle} billing
                </p>
                <p className="text-xs text-gray-500">
                  {showNextBillingLoading
                    ? t('subscription.overview.loading', 'Loading...')
                    : nextBillingOverride?.date
                    ? t('subscription.overview.nextPayment', 'Next payment: X', { date: formatDate(nextBillingOverride.date.toISOString()) })
                    : subscriptionStatus.next_payment_date
                    ? t('subscription.overview.nextPayment', 'Next payment: X', { date: formatDate(subscriptionStatus.next_payment_date) })
                    : t('subscription.overview.nextPaymentDue', 'Next payment due')
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warnings and Alerts */}
        {(subscriptionStatus.needs_renewal || subscriptionStatus.over_limit) && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="space-y-1">
                {subscriptionStatus.needs_renewal && (
                  <p className="text-sm font-medium text-orange-800">
                    {subscriptionStatus.is_trial ? t('subscription.overview.trialExpiresSoon') : t('subscription.overview.subscriptionExpiresSoon')}
                  </p>
                )}
                {subscriptionStatus.over_limit && (
                  <p className="text-sm font-medium text-orange-800">
                    {t('subscription.overview.employeeLimitExceeded')}
                  </p>
                )}
                <p className="text-xs text-orange-600">
                  {subscriptionStatus.needs_renewal && t('subscription.overview.choosePlanRenew')}
                  {subscriptionStatus.over_limit && ` ${t('subscription.overview.upgradePlanEmployees')}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CurrentSubscription.displayName = 'CurrentSubscription';

