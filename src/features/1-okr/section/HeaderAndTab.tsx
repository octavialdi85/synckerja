import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, Building, User } from 'lucide-react';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'company-objectives',
      label: 'Company Objective',
      icon: Target,
      description: 'Company-wide objectives and key results',
      route: '/okr/company-objective'
    },
    {
      id: 'department-objectives',
      label: 'Department Objective',
      icon: Building,
      description: 'Department-level objectives and key results',
      route: '/okr/department-objective'
    },
    {
      id: 'individual-objectives',
      label: 'Individual Objective',
      icon: User,
      description: 'Individual employee objectives and key results',
      route: '/okr/individual-objective'
    }
  ];

  const handleTabClick = (tab: any) => {
    if (tab.route) {
      navigate(tab.route);
    }
    onTabChange(tab.id);
  };

  const getActiveTab = () => {
    if (location.pathname === '/okr/department-objective') {
      return 'department-objectives';
    }
    if (location.pathname === '/okr/individual-objective') {
      return 'individual-objectives';
    }
    return 'company-objectives';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">OKR Management</h1>
        <p className="text-xs text-gray-600">Manage objectives and key results for company, departments, and individuals</p>
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






