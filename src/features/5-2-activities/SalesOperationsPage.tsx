import { useLocation } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './HeaderAndTab';
import { SalesActivitiesPageContent } from './SalesActivitiesPageContent';
import { VisitSchedulingPage } from '@/features/5-2-jadwal-kunjungan/VisitSchedulingPage';
import { ClientVisitsPage } from '@/features/5-2-client_visits/ClientVisitsPage';
import { useSalesActivities } from '@/hooks/organized/sales';

/** Keeps sales-activities query subscribed so it is not cancelled when content remounts (e.g. Strict Mode). */
const SalesActivitiesQueryKeeper = () => {
  useSalesActivities();
  return null;
};

export const SalesOperationsPage = () => {
  const location = useLocation();
  const isActivitiesPath = location.pathname.includes('/operations/sales') && !location.pathname.includes('/jadwal-kunjungan') && !location.pathname.includes('/client-visits');

  // Determine which content to show based on route
  const renderContent = () => {
    if (location.pathname.includes('/jadwal-kunjungan')) {
      return <VisitSchedulingPage />;
    }
    if (location.pathname.includes('/client-visits')) {
      return <ClientVisitsPage />;
    }
    // Default to activities
    return <SalesActivitiesPageContent />;
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
                <HeaderAndTab />
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                {isActivitiesPath && <SalesActivitiesQueryKeeper />}
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

