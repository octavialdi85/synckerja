import { ReactNode, useEffect, useState } from 'react';
import { useOptimizedSubscription } from '@/features/10-management/hooks/useOptimizedSubscription';
// import { EmployeeLimitBlockModal } from './EmployeeLimitBlockModal';

interface EmployeeLimitHardGuardProps {
  children: ReactNode;
  feature?: string;
}

export const EmployeeLimitHardGuard = ({
  children,
  feature = 'this feature'
}: EmployeeLimitHardGuardProps) => {
  const {
    subscriptionStatus,
    statusLoading
  } = useOptimizedSubscription();

  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    // Check if user is over the employee limit
    if (subscriptionStatus?.over_limit && subscriptionStatus?.is_active) {
      setShowBlockModal(true);
    }
  }, [subscriptionStatus]);

  // Show loading while checking subscription
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        
      </div>
    );
  }

  // If over employee limit, show block modal instead of content
  if (subscriptionStatus?.over_limit && subscriptionStatus?.is_active) {
    return (
      <div className="p-4 text-center">
        <p>Employee limit exceeded. Please upgrade your subscription.</p>
      </div>
    );
  }

  return <>{children}</>;
};


