import { memo } from 'react';
import { Button } from '@/features/ui/button';
import { RefreshCw, CreditCard, Calendar } from 'lucide-react';
import type { SubscriptionStatus } from '../../hooks/useOptimizedSubscription';

interface QuickActionsPanelProps {
  subscriptionStatus?: SubscriptionStatus | null;
  onRefreshStatus: () => void;
}

export const QuickActionsPanel = memo(({ subscriptionStatus, onRefreshStatus }: QuickActionsPanelProps) => {
  return (
    <div className="space-y-2">
      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
        <h3 className="font-semibold text-gray-900 mb-1">Quick Actions</h3>
        <div className="space-y-1">
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={onRefreshStatus}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          <Button 
            className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
          
          <Button 
            className="w-full justify-start" 
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Manage Billing
          </Button>
        </div>
      </div>

      {/* Usage Summary */}
      {subscriptionStatus?.is_active && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <h4 className="font-medium text-gray-900 mb-1">Usage Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Members Used</span>
              <span className="font-medium">
                {subscriptionStatus.current_employees}/{subscriptionStatus.member_count}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(100, (subscriptionStatus.current_employees / subscriptionStatus.member_count) * 100)}%` 
                }}
              ></div>
            </div>
            {subscriptionStatus.over_limit && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Over member limit
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

QuickActionsPanel.displayName = 'QuickActionsPanel';
