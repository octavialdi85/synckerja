import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, BarChart3, Settings } from 'lucide-react';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Attendance Dashboard',
      icon: BarChart3,
      description: 'Overview of attendance performance metrics',
      route: '/attendance',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarDays,
      description: 'Manage employee attendance records and schedules',
      route: '/attendance/attendance',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configure attendance parameters and rules',
      route: '/attendance/settings',
    },
  ];

  const getActiveTab = () => {
    if (location.pathname === '/attendance/settings') return 'settings';
    if (location.pathname === '/attendance/attendance') return 'attendance';
    return 'dashboard';
  };

  const handleTabClick = (tab: (typeof tabs)[number]) => {
    onTabChange(tab.id);
    if (tab.route) {
      navigate(tab.route);
    }
  };

  const currentActiveTab = getActiveTab() || activeTab;

  return (
    <div className="px-1 py-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Attendance Management</h1>
        <p className="text-xs text-gray-600">Monitor employee attendance, insights, and settings</p>
      </div>

      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentActiveTab === tab.id || activeTab === tab.id;

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






























