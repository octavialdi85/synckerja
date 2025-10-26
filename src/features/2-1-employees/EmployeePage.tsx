import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
  EmployeeFilters,
  EmployeeMetricsCards,
  EmployeeTable,
  EmployeeOverview
} from './section';
import { useEmployees } from './hooks/useEmployees';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';

export const EmployeePage = () => {
  const [activeTab, setActiveTab] = useState('employees');
  
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleViewEmployee = useCallback((employeeId: string) => {
    navigate(`/my-info/personal?id=${employeeId}`);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Following ModernHomePage structure that works perfectly
  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content - EXACT SAME STRUCTURE AS HOME PAGE */}
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
                {/* Header and Tabs - Top Section like SectionMotivation in home */}
                <div className="flex-shrink-0 mb-2 mt-4">
                  <HeaderAndTab 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                  />
                </div>

                {/* Main Layout - Following home page grid pattern */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Left Column - Filters and Metrics (75% like home center+left) */}
                  <div className="col-span-9 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      {/* Filter Section */}
                      <div className="flex-shrink-0 mb-2">
                        <div className="bg-white border rounded-md p-2">
                          <EmployeeFilters />
                        </div>
                      </div>
                      
                      {/* Metrics Cards Section */}
                      <div className="flex-shrink-0 mb-2">
                        <EmployeeMetricsCards employees={employees} />
                      </div>
                      
                      {/* Table Section - Main Content */}
                      <div className="flex-1 min-h-0">
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                          <EmployeeTable 
                            employees={employees}
                            currentUserEmail={user?.email}
                            onRefresh={handleRefresh}
                            onViewEmployee={handleViewEmployee}
                            isLoading={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Overview Sidebar (25% like home right) */}
                  <div className="col-span-3 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <EmployeeOverview employees={employees} />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default EmployeePage;
