import React from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderAndTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HeaderAndTab = ({ activeTab, onTabChange }: HeaderAndTabProps) => {
  const navigate = useNavigate();
  
  const tabs = [
    { 
      id: 'daily-task', 
      label: 'Daily Task', 
      icon: CheckSquare,
      description: 'Manage your daily tasks and to-do lists',
      path: '/tools/daily-task'
    },
    { 
      id: 'meeting-notes', 
      label: 'Meeting Notes', 
      icon: FileText,
      description: 'Track and manage meeting discussions and action items',
      path: '/tools/meeting-notes'
    },
    {
      id: 'daily-task-report',
      label: 'Daily Task Report',
      icon: FileText,
      description: 'Analyze completed tasks, on-time performance, and delays',
      path: '/tools/daily-task-report'
    }
  ];

  const handleTabClick = (tab: any) => {
    onTabChange(tab.id);
    if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Tools</h1>
        <p className="text-xs text-gray-600">Manage your daily tasks and productivity tools</p>
      </div>

      {/* Tabs Section */}
      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
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





