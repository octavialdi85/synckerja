import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, FileText, CreditCard, BarChart3 } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppTranslation();

  const tabs = [
    {
      id: 'dashboard',
      label: t('kolManagement.header.tabs.dashboard', 'Dashboard'),
      icon: LayoutDashboard,
      description: t('kolManagement.header.tabs.dashboardDescription', 'Overview of KOL management metrics and insights'),
      route: '/kol-management/dashboard'
    },
    {
      id: 'kol-management',
      label: t('kolManagement.header.tabs.kolManagement', 'KOL Management'),
      icon: Users,
      description: t('kolManagement.header.tabs.kolManagementDescription', 'Manage KOL profiles, ratings, and information'),
      route: '/kol-management/kol-management'
    },
    {
      id: 'campaigns',
      label: t('kolManagement.header.tabs.campaigns', 'Campaigns'),
      icon: Megaphone,
      description: t('kolManagement.header.tabs.campaignsDescription', 'Manage KOL campaigns and assignments'),
      route: '/kol-management/campaigns'
    },
    {
      id: 'content-post',
      label: t('kolManagement.header.tabs.contentPost', 'Content Post'),
      icon: FileText,
      description: t('kolManagement.header.tabs.contentPostDescription', 'Manage content posts and deliverables'),
      route: '/kol-management/content-post'
    },
    {
      id: 'payment-terms',
      label: t('kolManagement.header.tabs.paymentTerms', 'Payment Terms'),
      icon: CreditCard,
      description: t('kolManagement.header.tabs.paymentTermsDescription', 'Manage payment terms and milestones'),
      route: '/kol-management/payment-terms'
    },
    {
      id: 'analytics',
      label: t('kolManagement.header.tabs.analytics', 'Analytics'),
      icon: BarChart3,
      description: t('kolManagement.header.tabs.analyticsDescription', 'View analytics and performance metrics'),
      route: '/kol-management/analytics'
    }
  ];

  const handleTabClick = (tab: any) => {
    if (tab.route) {
      navigate(tab.route);
    } else {
      onTabChange(tab.id);
    }
  };

  const getActiveTab = () => {
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
    
    return 'dashboard';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">
          {t('kolManagement.header.title', 'KOL Management')}
        </h1>
        <p className="text-xs text-gray-600">
          {t('kolManagement.header.description', 'Manage KOL profiles, campaigns, and content posts')}
        </p>
      </div>

      {/* Tabs Section */}
      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = getActiveTab() === tab.id;
            
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

HeaderAndTab.displayName = 'HeaderAndTab';
