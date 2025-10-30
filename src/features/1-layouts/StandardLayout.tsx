
import { ReactNode } from 'react';
import Header from '@/features/1-layouts/header/Header';
import { AppSidebar } from '@/features/1-layouts/sidebar/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/features/ui/sidebar';
import { SubscriptionBanner } from '@/features/share/banners';
import { useOptimizedSubscription } from '@/features/10-management/hooks/useOptimizedSubscription';

interface StandardLayoutProps {
  children: ReactNode;
}

export const StandardLayout = ({ children }: StandardLayoutProps) => {
  const { subscriptionStatus, statusLoading } = useOptimizedSubscription();
  
  // Debug logging for banner visibility
  console.log('🔍 Banner Debug:', {
    statusLoading,
    subscriptionStatus,
    isTrial: subscriptionStatus?.is_trial,
    daysUntilExpiry: subscriptionStatus?.days_until_expiry,
    needsRenewal: subscriptionStatus?.needs_renewal,
    isActive: subscriptionStatus?.is_active
  });
  
  // Show banner only when expiry is within 3 days (trial or paid)
  const daysLeft = subscriptionStatus?.days_until_expiry ?? Number.POSITIVE_INFINITY;
  const showBanner = !statusLoading && !!subscriptionStatus && daysLeft <= 3;
  
  console.log('🚨 Show Banner:', showBanner);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Header />
      
      <div className="flex flex-1 w-full mt-16">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Trial/Subscription Banner - positioned inside sidebar inset for proper layout */}
            {showBanner && (
              <div className="w-full bg-white border-b shadow-sm relative z-10">
                <SubscriptionBanner subscriptionStatus={subscriptionStatus} />
              </div>
            )}
            
            <main className={`flex-1 w-full ${showBanner ? 'pt-1' : ''}`}>
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
};
