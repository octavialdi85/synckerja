import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section/HeaderAndTab';
import { LoadingDots } from '@/components/LoadingDots';
import { DashboardOverview } from '@/features/2-3-dashboard';
import { EmployeeAttendanceTab } from '@/features/2-3-employee-attendance';
import { AttendanceSettings } from '@/features/2-3-settings';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

export const AttendancePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessPage, configLoading } = useDepartmentAccess();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentView, setCurrentView] = useState<'table' | 'calendar'>('table');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (location.pathname === '/attendance/settings') {
      setActiveTab('settings');
    } else if (location.pathname === '/attendance/attendance') {
      setActiveTab('attendance');
    } else if (location.pathname === '/attendance') {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (configLoading) {
      setIsLoading(true);
      return;
    }

    const currentPath = location.pathname;

    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      setIsLoading(false);
      return;
    }

    const hasAccess = canAccessPage(currentPath);

    if (!hasAccess) {
      if (currentPath === '/attendance') {
        const hasAttendanceAccess = canAccessPage('/attendance/attendance');
        if (hasAttendanceAccess) {
          navigate('/attendance/attendance', { replace: true });
          return;
        }
      }

      if (currentPath === '/attendance/attendance') {
        const hasSettingsAccess = canAccessPage('/attendance/settings');
        if (hasSettingsAccess) {
          navigate('/attendance/settings', { replace: true });
          return;
        }
      }

      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [location.pathname, canAccessPage, configLoading, isOwner, isAdmin, userRole, navigate]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleViewChange = useCallback((view: 'table' | 'calendar') => {
    setCurrentView(view);
  }, []);

  if (isLoading || configLoading) {
    return (
      <StandardLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <LoadingDots size="lg" />
            <p className="text-sm text-gray-600">Memuat halaman...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex-1 flex flex-col px-3 pb-3">
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
          <div className="flex-1 min-h-0">
            {activeTab === 'dashboard' && (
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                <DashboardOverview />
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="flex-1 min-h-0">
                <EmployeeAttendanceTab currentView={currentView} onViewChange={handleViewChange} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                <AttendanceSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default AttendancePage;

