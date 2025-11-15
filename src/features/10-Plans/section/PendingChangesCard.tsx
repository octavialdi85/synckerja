import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Calendar, Users, ArrowRight, X } from 'lucide-react';
import { usePendingSubscriptionChanges } from '@/features/10-Plans/hooks/usePendingSubscriptionChanges';
import { useCancelScheduledChange } from '@/features/10-Plans/hooks/useCancelScheduledChange';
import { formatIDR } from '@/features/1-login/utils/subscriptionUtils';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

export const PendingChangesCard = () => {
  const { t, language } = useAppTranslation();
  const { data: pendingChanges, isLoading } = usePendingSubscriptionChanges();
  const cancelScheduledChange = useCancelScheduledChange();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingChanges || pendingChanges.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getChangeTypeLabel = (type: string) => {
    const labels = {
      upgrade: t('subscription.plans.pendingChanges.changeType.upgrade', 'Upgrade Plan'),
      downgrade: t('subscription.plans.pendingChanges.changeType.downgrade', 'Downgrade Plan'),
      member_increase: t('subscription.plans.pendingChanges.changeType.memberIncrease', 'Add Members'),
      member_decrease: t('subscription.plans.pendingChanges.changeType.memberDecrease', 'Reduce Members'),
      mixed: t('subscription.plans.pendingChanges.changeType.mixed', 'Plan & Member Change')
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getChangeTypeColor = (type: string) => {
    const colors = {
      upgrade: 'bg-green-100 text-green-700',
      downgrade: 'bg-yellow-100 text-yellow-700',
      member_increase: 'bg-blue-100 text-blue-700',
      member_decrease: 'bg-orange-100 text-orange-700',
      mixed: 'bg-purple-100 text-purple-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const handleCancelChange = async (changeId: string) => {
    if (confirm(t('subscription.plans.pendingChanges.cancelConfirm', 'Are you sure you want to cancel this scheduled change?'))) {
      await cancelScheduledChange.mutateAsync(changeId);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-blue-900">
              {t('subscription.plans.pendingChanges.title', 'Scheduled Changes')}
            </CardTitle>
            <CardDescription className="text-blue-700">
              {applyVariables(t('subscription.plans.pendingChanges.description', '{{count}} changes will be applied'), { count: String(pendingChanges.length) })}
            </CardDescription>
          </div>
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {pendingChanges.map((change) => (
          <div 
            key={change.id}
            className="bg-white rounded-lg p-4 border border-blue-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={getChangeTypeColor(change.change_type)}>
                  {getChangeTypeLabel(change.change_type)}
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {formatDate(change.scheduled_date)}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelChange(change.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={cancelScheduledChange.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {/* Plan Change */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('subscription.plans.pendingChanges.plan', 'Plan:')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {change.current_plan?.name || 'Unknown'}
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-blue-600">
                    {change.target_plan?.name || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Member Count Change */}
              {change.current_member_count !== change.target_member_count && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('subscription.plans.pendingChanges.member', 'Member:')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {change.current_member_count}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-blue-600">
                      {change.target_member_count}
                    </span>
                  </div>
                </div>
              )}

              {/* Prorate Amount */}
              {change.prorate_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('subscription.plans.pendingChanges.additionalCost', 'Additional Cost:')}</span>
                  <span className="font-medium text-green-600">
                    {formatIDR(change.prorate_amount)}
                  </span>
                </div>
              )}
            </div>

            {change.notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <strong>{t('subscription.plans.pendingChanges.notes', 'Notes:')}</strong> {change.notes}
              </div>
            )}
          </div>
        ))}
        
        <div className="text-center">
          <p className="text-xs text-blue-600">
            {t('subscription.plans.pendingChanges.footer', 'Changes will be applied automatically on the scheduled date')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};