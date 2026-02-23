import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { SubscriptionStatus } from '@/features/10-management/hooks/useOptimizedSubscription';

interface RecentActivityProps {
  subscriptionStatus: SubscriptionStatus | null;
}

export const RecentActivity = memo(({ subscriptionStatus }: RecentActivityProps) => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-700">Recent Activity</CardTitle>
        <CardDescription className="text-slate-500">
          Latest subscription and billing activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {subscriptionStatus?.is_trial ? (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-700">
                  {subscriptionStatus.days_until_expiry < 0 ? 'Trial Period Expired' : 'Trial Period Active'}
                </p>
                <p className="text-sm text-orange-600">
                  {subscriptionStatus.days_until_expiry < 0 
                    ? `Expired ${Math.abs(subscriptionStatus.days_until_expiry)} days ago`
                    : subscriptionStatus.days_until_expiry === 0
                    ? 'Expires today'
                    : `Expires in ${subscriptionStatus.days_until_expiry} days`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-700">Subscription Active</p>
                <p className="text-sm text-emerald-600">
                  Your {subscriptionStatus?.plan_name} plan is active
                </p>
              </div>
            </div>
          )}
          
          {subscriptionStatus?.over_limit && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-700">Employee Limit Exceeded</p>
                <p className="text-sm text-red-600">
                  You have {subscriptionStatus.current_employees} employees, but your plan allows {subscriptionStatus.member_count}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

RecentActivity.displayName = 'RecentActivity';

