
import { ReactNode } from 'react';
import Header from '@/features/1-layouts/header/Header';
import { AppSidebar } from '@/features/1-layouts/sidebar/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/features/ui/sidebar';
import { SubscriptionBanner } from '@/features/share/banners';
import { useOptimizedSubscription } from '@/features/1-login/hooks/useOptimizedSubscription';

interface StandardLayoutProps {
  children: ReactNode;
}

export const StandardLayout = ({ children }: StandardLayoutProps) => {
  const { subscriptionStatus } = useOptimizedSubscription();
  
  // Only show banner if we have valid subscription data and it needs renewal
  const showBanner = subscriptionStatus?.needs_renewal && subscriptionStatus?.is_active && subscriptionStatus?.days_until_expiry !== undefined;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Header />
      
      <div className="flex flex-1 w-full">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 min-w-0">
            {/* Trial/Subscription Banner - positioned inside sidebar inset for full width */}
            {showBanner && (
              <div className="w-full bg-white border-b">
                <SubscriptionBanner subscriptionStatus={subscriptionStatus} />
              </div>
            )}
            
            <main className="flex-1 w-full">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
};
