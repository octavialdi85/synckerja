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
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';

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

  const handleAddEmployee = useCallback(() => {
    navigate('/employees/add');
  }, [navigate]);

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
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
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
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
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
                
                {/* Right Column - Overview Sidebar (25% like employee page) */}
                <div className="col-span-3 h-full">
                  <div className="h-full flex flex-col">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">Employee Overview</h3>
                            <p className="text-xs text-gray-500 mt-1">Summary of employee data</p>
                          </div>
                          <Button
                            onClick={handleAddEmployee}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Employee
                          </Button>
                        </div>
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
