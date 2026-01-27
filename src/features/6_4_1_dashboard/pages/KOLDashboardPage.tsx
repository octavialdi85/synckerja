import { useEffect, lazy, Suspense, memo, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '../section';
import { Skeleton } from '@/features/ui/skeleton';

// Lazy load components for better performance
const EnhancedKOLDashboard = lazy(() => import('../components/EnhancedKOLDashboard').then(m => ({ default: m.default })));
const EnhancedKOLManagementContent = lazy(() => import('../components/EnhancedKOLManagementContent').then(m => ({ default: m.default })));
const EnhancedKOLCampaignsContent = lazy(() => import('../components/EnhancedKOLCampaignsContent').then(m => ({ default: m.default })));
const EnhancedKOLContentPostTab = lazy(() => import('../components/EnhancedKOLContentPostTab').then(m => ({ default: m.default })));
const KOLPaymentTermsTab = lazy(() => import('../components/KOLPaymentTermsTab').then(m => ({ default: m.default })));
const EnhancedKOLAnalyticsTab = lazy(() => import('../components/EnhancedKOLAnalyticsTab').then(m => ({ default: m.default })));

// Loading skeleton component
const TabLoadingSkeleton = memo(() => (
  <div className="space-y-4 p-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
));
TabLoadingSkeleton.displayName = 'TabLoadingSkeleton';

const KOLDashboardPageComponent = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on pathname (more reliable than useParams)
  const activeTab = useMemo(() => {
    const pathname = location.pathname;
    
    if (pathname === '/kol-management/dashboard' || pathname === '/kol-management') {
      return 'dashboard';
    }
    if (pathname === '/kol-management/kol-management') {
      return 'kol-management';
    }
    if (pathname === '/kol-management/campaigns') {
      return 'campaigns';
    }
    if (pathname === '/kol-management/content-post') {
      return 'content-post';
    }
    if (pathname === '/kol-management/payment-terms') {
      return 'payment-terms';
    }
    if (pathname === '/kol-management/analytics') {
      return 'analytics';
    }
    
    // Fallback: use tab param if available
    if (tab) {
      const validTabs = ['dashboard', 'kol-management', 'content-post', 'campaigns', 'payment-terms', 'analytics'];
      if (validTabs.includes(tab)) {
        return tab;
      }
    }
    
    return 'dashboard';
  }, [location.pathname, tab]);

  // Redirect to dashboard if no valid route (only when pathname is exactly '/kol-management')
  useEffect(() => {
    if (location.pathname === '/kol-management') {
      navigate('/kol-management/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = useCallback((newTab: string) => {
    // Navigate to the correct route - activeTab will update automatically based on pathname
    if (newTab === 'dashboard') {
      navigate('/kol-management/dashboard');
    } else {
      navigate(`/kol-management/${newTab}`);
    }
  }, [navigate]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="seamless-scroll max-h-[calc(100vh-200px)] overflow-y-auto">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLDashboard />
            </Suspense>
          </div>
        );
      case 'kol-management':
        return (
          <div className="w-full h-full">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLManagementContent />
            </Suspense>
          </div>
        );
      case 'campaigns':
        return (
          <div className="w-full h-full">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLCampaignsContent />
            </Suspense>
          </div>
        );
      case 'content-post':
        return (
          <div className="w-full h-full">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLContentPostTab />
            </Suspense>
          </div>
        );
      case 'payment-terms':
        return (
          <div className="seamless-scroll max-h-[calc(100vh-200px)] overflow-y-auto">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <KOLPaymentTermsTab />
            </Suspense>
          </div>
        );
      case 'analytics':
        return (
          <div className="seamless-scroll max-h-[calc(100vh-200px)] overflow-y-auto">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLAnalyticsTab />
            </Suspense>
          </div>
        );
      default:
        return (
          <div className="seamless-scroll max-h-[calc(100vh-200px)] overflow-y-auto">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EnhancedKOLDashboard />
            </Suspense>
          </div>
        );
    }
  };

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area - Full Height */}
              <div className="flex-1 min-h-0 h-full">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

KOLDashboardPageComponent.displayName = 'KOLDashboardPage';

const KOLDashboardPage = memo(KOLDashboardPageComponent);

export default KOLDashboardPage;
