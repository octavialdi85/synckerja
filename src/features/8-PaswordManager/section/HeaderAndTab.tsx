import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Key } from 'lucide-react';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'vault',
      label: 'Password Vault',
      icon: Key,
      description: 'View and manage all your stored passwords',
      route: '/tools/password-manager'
    }
  ];

  const handleTabClick = (tab: any) => {
    if (tab.route) {
      // For now, just change the tab without navigation since we don't have those routes yet
      // navigate(tab.route);
      onTabChange(tab.id);
    } else {
      onTabChange(tab.id);
    }
  };

  const getActiveTab = () => {
    return 'vault';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Password Manager</h1>
        <p className="text-xs text-gray-600">Securely store, manage, and generate strong passwords</p>
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

