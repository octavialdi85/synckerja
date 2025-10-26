import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, AlertTriangle, FileText, UserCheck } from 'lucide-react';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'employees',
      label: 'Employee Management',
      icon: Users,
      description: 'Manage employee data, profiles, and information',
      route: '/employees'
    },
    {
      id: 'reprimand',
      label: 'Reprimand Management',
      icon: AlertTriangle,
      description: 'Track and manage employee disciplinary actions',
      route: '/employees/reprimand'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Generate reprimand reports and analytics',
      route: '/employees/reprimand/reports'
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: UserCheck,
      description: 'Review and approve reprimand actions',
      route: '/employees/reprimand/approvals'
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
    if (location.pathname === '/employees/reprimand/reports') {
      return 'reports';
    }
    if (location.pathname === '/employees/reprimand/approvals') {
      return 'approvals';
    }
    if (location.pathname === '/employees/reprimand') {
      return 'reprimand';
    }
    if (location.pathname === '/employees') {
      return 'employees';
    }
    return 'reprimand';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Reprimand Management</h1>
        <p className="text-xs text-gray-600">Track and manage employee disciplinary actions and performance issues</p>
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
