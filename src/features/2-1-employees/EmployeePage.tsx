import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
  EmployeeFilters,
  EmployeeMetricsCards,
  EmployeeTable,
  EmployeeOverview
} from './section';
import { EmployeeSidebarFooter } from './section/EmployeeSidebarFooter';
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

  return (
    <StandardLayout>
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

              {/* Grid Layout: 12 columns (9-3) */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                      {/* Filters Section */}
                      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 flex items-center">
                        <div className="w-full">
                          <EmployeeFilters />
                        </div>
                      </div>

                      {/* Metrics Cards Section */}
                      <div className="flex-shrink-0 p-3 border-b border-gray-200">
                        <EmployeeMetricsCards employees={employees} />
                      </div>

                      {/* Scrollable Table Content */}
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full p-4">
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
                </div>
                
                {/* Sidebar - 3 columns */}
                <div className="col-span-3 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-900">Employee Overview</h3>
                        <p className="text-xs text-gray-500 mt-1">Summary of employee data</p>
                      </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full p-4">
                          <EmployeeOverview employees={employees} />
                        </div>
                      </div>

                      {/* Sidebar Footer */}
                      <EmployeeSidebarFooter 
                        totalDepartments={[...new Set(employees.map(emp => emp.department_name).filter(Boolean))].length}
                        selectedDepartment="all"
                        totalEmployees={employees.length}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default EmployeePage;
