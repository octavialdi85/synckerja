import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrganizationalDiagram } from './organization/OrganizationalDiagram';
import { OrganizationStatistics } from './organization/OrganizationStatistics';
import { useOrganizationalStructure } from './hooks/useOrganizationalStructure';
import { Skeleton } from '@/features/ui/skeleton';
import { Card, CardContent } from '@/features/ui/card';
import { HeaderAndTab } from './HeaderAndTab';

export const CompanyOrganizationPage = () => {
  const [activeTab, setActiveTab] = useState('organization');
  const navigate = useNavigate();
  
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const {
    statistics,
    isLoading
  } = useOrganizationalStructure();
  
  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/my-info/personal?id=${employeeId}`);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="space-y-2">
        {/* Statistics Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {Array(4).fill(0).map((_, i) => <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Diagram Loading */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-full" />
              <div className="flex justify-center">
                <div className="space-y-3">
                  <Skeleton className="h-16 w-40 rounded-lg" />
                  <div className="flex gap-3 justify-center">
                    <Skeleton className="h-12 w-32 rounded-lg" />
                    <Skeleton className="h-12 w-32 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="h-full flex flex-col">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="space-y-2">
                  <OrganizationStatistics statistics={statistics} />
                  <OrganizationalDiagram onEmployeeClick={handleEmployeeClick} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
