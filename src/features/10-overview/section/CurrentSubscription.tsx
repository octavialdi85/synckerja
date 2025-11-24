import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Progress } from '@/features/ui/progress';
import { Calendar, Users, CreditCard, AlertTriangle } from 'lucide-react';
import type { SubscriptionStatus } from '@/hooks/useOptimizedSubscription';

interface CurrentSubscriptionProps {
  subscriptionStatus: SubscriptionStatus;
}

export const CurrentSubscription = memo(({
  subscriptionStatus
}: CurrentSubscriptionProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const maxEmployees = subscriptionStatus.member_count || 1000;
  const employeeUsagePercentage = (subscriptionStatus.current_employees / maxEmployees) * 100;
  const isNearLimit = employeeUsagePercentage >= 80;
  
  const expiryDate = subscriptionStatus.is_trial 
    ? subscriptionStatus.trial_end_date || subscriptionStatus.end_date
    : subscriptionStatus.subscription_end_date || subscriptionStatus.end_date;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Current Subscription
              {subscriptionStatus.is_trial && <Badge variant="secondary">Trial</Badge>}
            </CardTitle>
            <CardDescription>
              {subscriptionStatus.plan_name} Plan
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
              <span className="text-sm font-medium">Employee Usage</span>
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
                  Over limit! Please upgrade your plan.
                </p>
              )}
            </div>
          </div>

          {/* Subscription Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {subscriptionStatus.is_trial ? 'Trial Period' : 'Subscription'}
              </span>
            </div>
            <div className="text-sm">
              <p className="text-gray-700">
                {subscriptionStatus.is_trial ? 'Ends' : 'Renews'} on{' '}
                {expiryDate && formatDate(expiryDate)}
              </p>
              <p className={`text-xs ${(subscriptionStatus.days_until_expiry || 0) <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                {subscriptionStatus.days_until_expiry < 0
                  ? `Expired ${Math.abs(subscriptionStatus.days_until_expiry)} days ago`
                  : subscriptionStatus.days_until_expiry === 0
                  ? 'Expires today'
                  : `${subscriptionStatus.days_until_expiry} days remaining`
                }
              </p>
            </div>
          </div>

          {/* Billing */}
          {!subscriptionStatus.is_trial && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Billing</span>
              </div>
              <div className="text-sm">
                <p className="text-gray-700 capitalize">
                  {subscriptionStatus.billing_cycle} billing
                </p>
                <p className="text-xs text-gray-500">
                  {subscriptionStatus.next_payment_date 
                    ? `Next payment: ${formatDate(subscriptionStatus.next_payment_date)}`
                    : 'Next payment due'
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
                    {subscriptionStatus.is_trial ? 'Trial' : 'Subscription'} expires soon
                  </p>
                )}
                {subscriptionStatus.over_limit && (
                  <p className="text-sm font-medium text-orange-800">
                    Employee limit exceeded
                  </p>
                )}
                <p className="text-xs text-orange-600">
                  {subscriptionStatus.needs_renewal && `${subscriptionStatus.is_trial ? 'Choose a plan' : 'Renew your subscription'} to avoid service interruption.`}
                  {subscriptionStatus.over_limit && ' Please upgrade your plan to accommodate all employees.'}
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

