import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Network, Package } from 'lucide-react';
import { useDepartmentAccess } from '@/features/1-layouts/sidebar/useDepartmentAccess';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// HeaderAndTab for Organization page only - independent from other tabs
export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAccessPage } = useDepartmentAccess();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'View company profile, mission, vision, and basic information',
      route: '/company/dashboard'
    },
    {
      id: 'company-assets',
      label: 'Company Assets',
      icon: Package,
      description: 'Manage company assets and inventory',
      route: '/company/company-assets'
    },
    {
      id: 'files',
      label: 'Files',
      icon: FileText,
      description: 'Manage company documents and files',
      route: '/company/files'
    },
    {
      id: 'organization',
      label: 'Organization',
      icon: Network,
      description: 'View organizational structure and hierarchy',
      route: '/company/organization'
    }
  ];

  const handleTabClick = (tab: any) => {
    if (tab.route && canAccessPage(tab.route)) {
      navigate(tab.route);
    } else {
      onTabChange(tab.id);
    }
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/company/dashboard') return 'dashboard';
    if (path === '/company/company-assets') return 'company-assets';
    if (path === '/company/files') return 'files';
    if (path === '/company/organization') return 'organization';
    return 'organization';
  };

  const activeTabId = getActiveTab();

  return (
    <div className="py-3 pl-2 ml-0 organization-header-tab-wrapper">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Company Management</h1>
        <p className="text-xs text-gray-600">Manage company profile, assets, files, and organizational structure</p>
      </div>

      {/* Tabs Section */}
      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            const canAccess = canAccessPage(tab.route);
            
            return (
              <div
                key={tab.id}
                onClick={() => canAccess && handleTabClick(tab)}
                className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm transition-colors ${
                  canAccess
                    ? isActive
                      ? 'border-blue-500 text-blue-600 cursor-pointer'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
                    : 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
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

HeaderAndTab.displayName = 'OrganizationHeaderAndTab';

