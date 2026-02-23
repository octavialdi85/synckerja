import { memo, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { Skeleton } from '@/features/ui/skeleton';
import { LoadingDots } from '@/components/LoadingDots';
import { HeaderAndTab } from '../10-overview/section/HeaderAndTab';
import HRISSubscriptionPlansTab from './HRISSubscriptionPlansTab';

const PlansTabPage = memo(() => {
  useOptimizedPerformanceMonitor('PlansTabPage');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plans');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    
    // Navigate to the appropriate route
    switch (tab) {
      case 'overview':
        navigate('/subscription/overview');
        break;
      case 'plans':
        navigate('/subscription/plans');
        break;
      case 'management':
        navigate('/subscription/management');
        break;
      default:
        navigate('/subscription/plans');
    }
  }, [navigate]);
  
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
            <div className="h-full flex flex-col min-h-0">
                {/* Header and Tab Navigation */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                  />
                </div>

                {/* Plans Content - overflow-hidden agar section tidak overlap keluar area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <Suspense fallback={
                    <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full overflow-hidden">
                      <div className="col-span-9 flex flex-col min-h-0">
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                          <LoadingDots size="lg" />
                        </div>
                      </div>
                      <div className="col-span-3 flex flex-col min-h-0">
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                          <LoadingDots size="lg" />
                        </div>
                      </div>
                    </div>
                  }>
                    <HRISSubscriptionPlansTab />
                  </Suspense>
                </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
});

PlansTabPage.displayName = 'PlansTabPage';

export default PlansTabPage;
