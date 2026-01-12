import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, FileCheck, CreditCard, Bell } from 'lucide-react';

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
      label: 'Expense Dashboard',
      icon: BarChart3,
      description: 'View expense analytics, metrics, and trends',
      route: '/expenses/dashboard'
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: FileCheck,
      description: 'Manage expense approval requests and approvals',
      route: '/expenses/approvals'
    },
    {
      id: 'payment-process',
      label: 'Payment Process',
      icon: CreditCard,
      description: 'Manage payment processing and payment requests',
      route: '/expenses/payment-process'
    },
    {
      id: 'reminder-bills',
      label: 'Reminder Bills',
      icon: Bell,
      description: 'Manage bill reminders and scheduled payments',
      route: '/expenses/reminder-bills'
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
    if (location.pathname === '/expenses/reminder-bills') {
      return 'reminder-bills';
    }
    if (location.pathname === '/expenses/payment-process') {
      return 'payment-process';
    }
    if (location.pathname === '/expenses/approvals') {
      return 'approvals';
    }
    if (location.pathname === '/expenses/dashboard') {
      return 'dashboard';
    }
    return 'dashboard';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Expense Management</h1>
        <p className="text-xs text-gray-600">Manage expense transactions, analytics, and financial records</p>
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
