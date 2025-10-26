import { memo } from 'react';
import { Badge } from '@/features/ui/badge';
import { TrendingUp, Calendar, Users } from 'lucide-react';
import type { SubscriptionStatus } from '../../hooks/useOptimizedSubscription';

interface CurrentPlanSectionProps {
  subscriptionStatus?: SubscriptionStatus | null;
}

export const CurrentPlanSection = memo(({ subscriptionStatus }: CurrentPlanSectionProps) => {
  return (
    <div className="lg:col-span-2 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Current Plan */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <label className="text-sm font-medium text-gray-700">Current Plan</label>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg font-semibold text-blue-900">
              {subscriptionStatus?.plan_name || 'No Plan'}
            </p>
            <Badge 
              variant={subscriptionStatus?.is_active ? "default" : "destructive"}
              className="mt-2"
            >
              {subscriptionStatus?.status || 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Billing Cycle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <label className="text-sm font-medium text-gray-700">Billing Cycle</label>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-lg font-semibold text-green-900 capitalize">
              {subscriptionStatus?.billing_cycle || 'N/A'}
            </p>
            <p className="text-sm text-green-700 mt-1">
              Auto-renewal enabled
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Team Members */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            <label className="text-sm font-medium text-gray-700">Team Members</label>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-lg font-semibold text-purple-900">
              {subscriptionStatus?.current_employees || 0} / {subscriptionStatus?.member_count || 0}
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Current / Allowed
            </p>
          </div>
        </div>

        {/* Next Billing Date */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <label className="text-sm font-medium text-gray-700">Next Billing Date</label>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-lg font-semibold text-orange-900">
              {subscriptionStatus?.subscription_end_date 
                ? new Date(subscriptionStatus.subscription_end_date).toLocaleDateString('id-ID')
                : 'N/A'
              }
            </p>
            <p className="text-sm text-orange-700 mt-1">
              {subscriptionStatus?.days_until_expiry 
                ? `${subscriptionStatus.days_until_expiry} days remaining`
                : 'No expiry date'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

CurrentPlanSection.displayName = 'CurrentPlanSection';
