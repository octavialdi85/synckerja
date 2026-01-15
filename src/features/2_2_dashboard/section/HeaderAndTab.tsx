import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, Users, FileText, ClipboardList } from 'lucide-react';

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
      label: 'Dashboard',
      icon: Briefcase,
      description: 'Overview of job openings and recruitment metrics',
      route: '/recruitment'
    },
    {
      id: 'job-openings',
      label: 'Job Openings',
      icon: FileText,
      description: 'Manage job openings and postings',
      route: '/recruitment/job-openings'
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: ClipboardList,
      description: 'Manage and review candidate applications',
      route: '/recruitment/applications'
    },
    {
      id: 'interviewees',
      label: 'Interviewees',
      icon: Users,
      description: 'Manage candidate interviews and evaluations',
      route: '/recruitment/interviewees'
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
    if (location.pathname === '/recruitment/interviewees') {
      return 'interviewees';
    }
    if (location.pathname === '/recruitment/applications') {
      return 'applications';
    }
    if (location.pathname === '/recruitment/job-openings') {
      return 'job-openings';
    }
    if (location.pathname === '/recruitment') {
      return 'dashboard';
    }
    return 'dashboard';
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Recruitment</h1>
        <p className="text-xs text-gray-600">Manage job openings, applications, and recruitment process</p>
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
