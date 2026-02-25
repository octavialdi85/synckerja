import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { CreditCard, Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import type { SubscriptionStatus } from '@/features/10-management/hooks/useOptimizedSubscription';

interface MetricCardsProps {
  subscriptionStatus: SubscriptionStatus | null;
  /** When set, overrides days remaining to match Payment History */
  daysRemainingOverride?: number | null;
  /** When true and no override, show loading for days (avoids wrong 58 on first paint). */
  nextBillingLoading?: boolean;
}

export const MetricCards = memo(({ subscriptionStatus, daysRemainingOverride, nextBillingLoading }: MetricCardsProps) => {
  // Optimized quick stats computation  
  const quickStats = useMemo(() => {
    if (!subscriptionStatus) return [];
    
    // Enhanced plan name display
    const planName = subscriptionStatus?.plan_name || 'No Active Plan';
    const isActive = subscriptionStatus?.is_active || false;
    
    // Enhanced member count with better data mapping  
    const currentEmployees = subscriptionStatus?.current_employees || 
                            subscriptionStatus?.employee_count || 0;
    const memberLimit = subscriptionStatus?.member_count || 
                       subscriptionStatus?.member_limit || 0;
    
    // Days: prefer override from payment-history logic so Overview matches Management/Payment History
    const daysLeft = nextBillingLoading && daysRemainingOverride == null
      ? 0
      : Math.max(0,
          daysRemainingOverride ??
          subscriptionStatus?.days_until_expiry ??
          subscriptionStatus?.days_remaining ?? 0
        );
    const daysLeftLoading = nextBillingLoading && daysRemainingOverride == null;
    
    // Enhanced status with more detailed information
    const isTrial = subscriptionStatus?.is_trial || false;
    const status = isTrial ? 'Trial' : 
                  subscriptionStatus?.status || 'Unknown';
    
    return [{
      title: 'Current Plan',
      value: planName,
      icon: CreditCard,
      color: isActive ? 'text-emerald-600' : 'text-red-500'
    }, {
      title: 'Active Members',
      value: `${currentEmployees} / ${memberLimit}`,
      icon: Users,
      color: (subscriptionStatus?.over_limit || subscriptionStatus?.is_over_limit) ? 
             'text-red-500' : 'text-emerald-600'
    }, {
      title: isTrial ? 'Trial Days Left' : 'Days Remaining',
      value: daysLeftLoading ? '...' : daysLeft,
      icon: Calendar,
      color: daysLeftLoading ? 'text-gray-500' : (daysLeft <= 3 ? 'text-red-500' : 
             daysLeft <= 7 ? 'text-yellow-600' : 'text-emerald-600')
    }, {
      title: 'Subscription Status',
      value: status,
      icon: isActive ? CheckCircle : AlertCircle,
      color: isActive ? 'text-emerald-600' : 'text-red-500'
    }];
  }, [subscriptionStatus, daysRemainingOverride, nextBillingLoading]);

  // Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop
  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 min-w-0';

  // ENHANCED NULL CHECK with Fallback Data
  if (!subscriptionStatus || quickStats.length === 0) {
    return (
      <div className={gridClass}>
        <Card className="border-slate-200 shadow-sm min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">Current Plan</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-400">Loading...</p>
              </div>
              <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">Active Members</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-400">- / -</p>
              </div>
              <Users className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">Days Remaining</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-400">-</p>
              </div>
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">Status</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-400">Loading</p>
              </div>
              <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render real subscription data
  return (
    <div className={gridClass}>
      {quickStats.map((stat, index) => (
        <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                <p className={`text-xl sm:text-2xl font-bold ${stat.color} truncate`} title={String(stat.value)}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${stat.color} flex-shrink-0`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Only re-render if plan_name or key metrics change
  if (!prevProps.subscriptionStatus && !nextProps.subscriptionStatus) return true;
  if (!prevProps.subscriptionStatus || !nextProps.subscriptionStatus) return false;
  
  return (
    prevProps.subscriptionStatus.plan_name === nextProps.subscriptionStatus.plan_name &&
    prevProps.subscriptionStatus.current_employees === nextProps.subscriptionStatus.current_employees &&
    prevProps.subscriptionStatus.member_count === nextProps.subscriptionStatus.member_count &&
    (prevProps.daysRemainingOverride ?? prevProps.subscriptionStatus.days_until_expiry) === (nextProps.daysRemainingOverride ?? nextProps.subscriptionStatus.days_until_expiry) &&
    prevProps.nextBillingLoading === nextProps.nextBillingLoading &&
    prevProps.subscriptionStatus.is_active === nextProps.subscriptionStatus.is_active
  );
});

MetricCards.displayName = 'MetricCards';

