import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Receipt, DollarSign, CreditCard } from 'lucide-react';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'purchase',
      label: 'Purchase',
      icon: ShoppingCart,
      description: 'Submit purchase requests for items and services',
      route: '/request-form/purchase'
    },
    {
      id: 'reimbursement',
      label: 'Reimbursement',
      icon: Receipt,
      description: 'Request reimbursement for expenses',
      route: '/request-form/reimbursement'
    },
    {
      id: 'cash-advance',
      label: 'Cash Advance',
      icon: DollarSign,
      description: 'Request cash advance for business needs',
      route: '/request-form/cash-advance'
    },
    {
      id: 'loan',
      label: 'Loan',
      icon: CreditCard,
      description: 'Request loans and financial assistance',
      route: '/request-form/loan'
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
    const path = location.pathname;
    if (path.includes('/reimbursement')) return 'reimbursement';
    if (path.includes('/cash-advance')) return 'cash-advance';
    if (path.includes('/loan')) return 'loan';
    if (path.includes('/purchase')) return 'purchase';
    return 'purchase';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Request Form</h1>
        <p className="text-xs text-gray-600">Submit and manage purchase requests, reimbursements, and financial requests</p>
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
