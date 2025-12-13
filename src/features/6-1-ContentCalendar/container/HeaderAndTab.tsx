import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, BookOpen, Settings } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface HeaderAndTabProps {
  activeMainTab: string;
  handleTabChange: (newTab: string) => void;
}

export const HeaderAndTab = ({ activeMainTab, handleTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppTranslation();

  const tabs = [
    {
      id: 'dashboard',
      label: t('productKnowledge.tabs.dashboard', 'Dashboard'),
      icon: LayoutDashboard,
      description: t('productKnowledge.tabs.dashboardDescription', 'Social media dashboard and metrics'),
      route: '/digital-marketing/social-media/dashboard'
    },
    {
      id: 'content-calendar',
      label: t('productKnowledge.tabs.contentCalendar', 'Content Calendar'),
      icon: Calendar,
      description: t('productKnowledge.tabs.contentCalendarDescription', 'Manage content calendar'),
      route: '/digital-marketing/social-media/content-calendar'
    },
    {
      id: 'product-knowledge',
      label: t('productKnowledge.tabs.productKnowledge', 'Product Knowledge'),
      icon: BookOpen,
      description: t('productKnowledge.tabs.productKnowledgeDescription', 'Manage product knowledge'),
      route: '/digital-marketing/social-media/product-knowledge'
    },
    {
      id: 'settings',
      label: t('productKnowledge.tabs.settings', 'Settings'),
      icon: Settings,
      description: t('productKnowledge.tabs.settingsDescription', 'Social media settings'),
      route: '/digital-marketing/social-media/settings'
    }
  ];

  const handleTabClick = (tab: any) => {
    handleTabChange(tab.id);
    if (tab.route) {
      navigate(tab.route);
    }
  };

  const getActiveTab = () => {
    if (location.pathname.includes('content-calendar')) {
      return 'content-calendar';
    }
    if (location.pathname.includes('product-knowledge')) {
      return 'product-knowledge';
    }
    if (location.pathname.includes('settings')) {
      return 'settings';
    }
    return 'dashboard';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">{t('productKnowledge.header.title', 'Social Media Management')}</h1>
        <p className="text-xs text-gray-600">{t('productKnowledge.header.subtitle', 'Manage social media content and calendar')}</p>
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
