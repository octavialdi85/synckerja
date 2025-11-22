import React, { useState, useMemo, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { LoadingDots } from '@/components/LoadingDots';
import { HeaderAndTab } from './HeaderAndTab';
import { useEmployees } from './hooks/useEmployees';
import { useReprimands } from './hooks/useReprimands';
import ReprimandManagementHeader from './ReprimandManagementHeader';
import ReprimandManagementFilters from './ReprimandManagementFilters';
import ReprimandManagementMetricsCards from './ReprimandManagementMetricsCards';
import { ReprimandManagementTable } from './ReprimandManagementTable';
import ReprimandManagementOverview from './ReprimandManagementOverview';

interface ReprimandCount {
  [employeeId: string]: number;
}

interface ReprimandFilters {
  search: string;
  department: string;
  status: string;
  severity: string;
  type: string;
  timePeriod: string;
}

export const ReprimandManagementPage = () => {
  const [activeTab, setActiveTab] = useState('reprimand');
  
  // Fetch data from Supabase
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { reprimands, isLoading: reprimandsLoading } = useReprimands();
  
  const [filters, setFilters] = useState<ReprimandFilters>({
    search: '',
    department: 'all',
    status: 'all',
    severity: 'all',
    type: 'all',
    timePeriod: 'all',
  });

  const updateFilter = (key: keyof ReprimandFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      department: 'all',
      status: 'all',
      severity: 'all',
      type: 'all',
      timePeriod: 'all',
    });
  };

  // Filter reprimands based on filters
  const filteredReprimands = useMemo(() => {
    return reprimands.filter(reprimand => {
      // Search filter (search in employee name via employee_id)
      if (filters.search) {
        const employee = employees.find(e => e.id === reprimand.employee_id);
        const searchLower = filters.search.toLowerCase();
        if (!employee?.full_name.toLowerCase().includes(searchLower) &&
            !reprimand.violation_description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && reprimand.status !== filters.status) {
        return false;
      }

      // Severity filter
      if (filters.severity !== 'all' && reprimand.severity_level !== filters.severity) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && reprimand.reprimand_type !== filters.type) {
        return false;
      }

      // Time period filter
      if (filters.timePeriod !== 'all') {
        const reprimandDate = new Date(reprimand.created_at || reprimand.incident_date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - reprimandDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.timePeriod) {
          case 'this_week':
            if (daysDiff > 7) return false;
            break;
          case 'this_month':
            if (daysDiff > 30) return false;
            break;
          case 'last_month':
            if (daysDiff < 30 || daysDiff > 60) return false;
            break;
          case 'last_3_months':
            if (daysDiff > 90) return false;
            break;
          case 'last_6_months':
            if (daysDiff > 180) return false;
            break;
          case 'this_year':
            if (reprimandDate.getFullYear() !== now.getFullYear()) return false;
            break;
          case 'last_year':
            if (reprimandDate.getFullYear() !== now.getFullYear() - 1) return false;
            break;
        }
      }

      return true;
    });
  }, [reprimands, filters, employees]);

  // Calculate reprimand counts per employee (from ALL reprimands, not filtered)
  const reprimandCounts: ReprimandCount = reprimands.reduce((acc, reprimand) => {
    const employeeId = reprimand.employee_id;
    acc[employeeId] = (acc[employeeId] || 0) + 1;
    return acc;
  }, {} as ReprimandCount);

  // Filter employees by department (show ALL employees)
  const filteredEmployees = employees.filter(employee => {
    // Department filter
    if (filters.department !== 'all') {
      const dept = employee.departments?.name || 'Unassigned';
      if (dept !== filters.department) {
        return false;
      }
    }
    
    return true;
  });

  // Group ALL employees by department (even those with 0 reprimands)
  const employeesByDepartment = filteredEmployees.reduce((acc, employee) => {
    const dept = employee.departments?.name || 'Unassigned';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(employee);
    return acc;
  }, {} as Record<string, any[]>);

  const departments = [...new Set(employees.map(e => e.departments?.name || 'Unassigned'))];
  
  // Get filter options
  const getFilterOptions = () => {
    const statuses = [...new Set(reprimands.map((r: any) => r.status))].filter(Boolean) as string[];
    const severities = [...new Set(reprimands.map((r: any) => r.severity_level))].filter(Boolean) as string[];
    const types = [...new Set(reprimands.map((r: any) => r.reprimand_type))].filter(Boolean) as string[];

    return {
      departments: departments as string[],
      statuses,
      severities,
      types,
    };
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const getReprimandCount = (employeeId: string) => {
    return reprimandCounts[employeeId] || 0;
  };

  const renderReprimandBoxes = (count: number) => {
    const boxes = [];
    const maxBoxes = 5; // Maximum boxes to display (reduced from 10 to 5)
    
    // Determine color based on reprimand count
    const getBoxColor = (index: number, totalCount: number) => {
      if (index >= totalCount) {
        return 'bg-gray-100 border-gray-200'; // Empty box
      }
      
      // Different colors based on severity (adjusted for 5 boxes)
      if (totalCount >= 4) {
        return 'bg-red-600 border-red-700 shadow-md'; // Critical (4+ reprimands)
      } else if (totalCount >= 3) {
        return 'bg-orange-500 border-orange-600 shadow-sm'; // High (3 reprimands)
      } else if (totalCount >= 1) {
        return 'bg-yellow-500 border-yellow-600 shadow-sm'; // Medium (1-2 reprimands)
      }
      
      return 'bg-gray-100 border-gray-200'; // Default empty
    };

    for (let i = 0; i < maxBoxes; i++) {
      boxes.push(
        <div
          key={i}
          className={`w-6 h-6 rounded border transition-colors duration-200 ${getBoxColor(i, count)}`}
          title={i < count ? `Reprimand ${i + 1}` : count > maxBoxes ? `Showing ${maxBoxes} of ${count}` : 'No reprimand'}
        />
      );
    }

    return boxes;
  };

  if (employeesLoading || reprimandsLoading) {
    return (
      <StandardLayout>
        <div className="h-full bg-gray-100 flex flex-col font-sans relative">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
              <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-shrink-0 mb-1">
                    <HeaderAndTab 
                      activeTab={activeTab} 
                      onTabChange={handleTabChange} 
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                    <div className="col-span-9 h-full">
                      <div className="flex items-center justify-center min-h-96">
                        <LoadingDots size="lg" />
                      </div>
                    </div>
                    <div className="col-span-3 h-full">
                      <div className="h-full flex flex-col">
                        <ReprimandManagementOverview 
                          reprimands={[]}
                          employees={[]}
                        />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="h-full bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header and Tabs - Top Section like other pages */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Main Layout - Following employee page grid pattern */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Left Column - Main Content (75% like employee page) */}
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    {/* Filter Section */}
                    <div className="flex-shrink-0 mb-2">
                      <div className="bg-white border rounded-md p-2">
                        <ReprimandManagementFilters
                          filters={filters}
                          updateFilter={updateFilter}
                          getFilterOptions={getFilterOptions}
                          clearFilters={clearFilters}
                        />
                      </div>
                    </div>
                    
                    {/* Metrics Cards Section */}
                    <div className="flex-shrink-0 mb-2">
                      <ReprimandManagementMetricsCards 
                        reprimands={filteredReprimands}
                        employees={filteredEmployees}
                      />
                    </div>
                    
                    {/* Table Section - Main Content */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                        <ReprimandManagementTable
                          employeesByDepartment={employeesByDepartment}
                          reprimands={filteredReprimands}
                          selectedDepartment={filters.department}
                          getReprimandCount={getReprimandCount}
                          renderReprimandBoxes={renderReprimandBoxes}
                          totalEmployees={filteredEmployees.length}
                          totalReprimands={filteredReprimands.length}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Overview Sidebar (25% like employee page) */}
                <div className="col-span-3 h-full">
                  <div className="h-full flex flex-col">
                    <ReprimandManagementOverview 
                      reprimands={filteredReprimands}
                      employees={filteredEmployees}
                    />
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