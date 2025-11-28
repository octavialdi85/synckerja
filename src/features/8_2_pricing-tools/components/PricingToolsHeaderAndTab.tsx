import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, Megaphone } from 'lucide-react';

interface PricingToolsHeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const PricingToolsHeaderAndTab = ({ activeTab, onTabChange }: PricingToolsHeaderAndTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'pricing',
      label: 'Pricing Tools',
      icon: Calculator,
      description: 'Calculate pricing scenarios and profitability',
      route: '/tools/pricing-tools'
    },
    {
      id: 'promo',
      label: 'Promo Simulation',
      icon: Megaphone,
      description: 'Simulate promotional pricing scenarios',
      route: '/tools/promo-simulation'
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
    if (location.pathname === '/tools/promo-simulation') {
      return 'promo';
    }
    if (location.pathname === '/tools/pricing-tools') {
      return 'pricing';
    }
    return 'pricing';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Pricing Tools</h1>
        <p className="text-xs text-gray-600">Analyze pricing scenarios and profitability</p>
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

PricingToolsHeaderAndTab.displayName = 'PricingToolsHeaderAndTab';

