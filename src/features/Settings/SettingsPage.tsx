import React, { useMemo, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { User, Shield } from 'lucide-react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import ProfileSettings from './ProfileSettings';
import SecuritySettings from './SecuritySettings';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

// Tab configuration
const TAB_CONFIG = [
  { value: 'profile', labelKey: 'settings.tabs.profile', fallback: 'Profile', icon: User, route: '/settings' },
  { value: 'security', labelKey: 'settings.tabs.security', fallback: 'Security', icon: Shield, route: '/settings/security' },
] as const;

const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  
  // Memoize current tab calculation
  const currentTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/security')) return 'security';
    return 'profile';
  }, [location.pathname]);

  // Memoized tab click handler
  const handleTabClick = useCallback((tab: typeof TAB_CONFIG[0]) => {
    navigate(tab.route);
  }, [navigate]);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col max-w-6xl mx-auto w-full">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <div className="px-1 py-3">
                  {/* Header Section */}
                  <div className="mb-3">
                    <h1 className="text-xl font-bold text-gray-900 mb-0.5">
                      {t('settings.page.title', 'Settings')}
                    </h1>
                    <p className="text-xs text-gray-600">
                      {t('settings.page.subtitle', 'Manage your account and application preferences')}
                    </p>
                  </div>

                  {/* Tabs Section */}
                  <div className="-mb-3">
                    <nav className="flex space-x-6">
                      {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = currentTab === tab.value;
                        
                        return (
                          <div
                            key={tab.value}
                            onClick={() => handleTabClick(tab)}
                            className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
                              isActive
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                          >
                            <Icon className="w-4 h-4" />
                          <span>{t(tab.labelKey, tab.fallback)}</span>
                          </div>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                  {/* Scrollable Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                      <div className="p-4">
                        <Routes>
                          <Route index element={<ProfileSettings />} />
                          <Route path="profile" element={<ProfileSettings />} />
                          <Route path="security" element={<SecuritySettings />} />
                        </Routes>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default SettingsPage;
