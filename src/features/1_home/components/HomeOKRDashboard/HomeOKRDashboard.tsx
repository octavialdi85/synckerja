import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/features/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { SectionGreetings } from './component/SectionGreetings';
import { SectionQuickMenu } from './component/SectionQuickMenu';
import { ObjectivesTab } from './component/ObjectivesTab';
import { CompanyObjectivesProgressCard } from './component/CompanyObjectivesProgressCard';
import { DepartmentObjectivesProgressCard } from './component/DepartmentObjectivesProgressCard';
import { IndividualObjectivesProgressCard } from './component/IndividualObjectivesProgressCard';
import { AttendanceStatusProvider, useAttendanceStatus } from './component/AttendanceStatusProvider';
import { Target, Building, User } from 'lucide-react';
import type { OkrFilterState } from './types/okr-filter';
import type { YearQuarterSelection } from './component/FiturTimePeriod';
import { useOkrCycles } from './hooks/useOkrCycles';
import { useCurrentOrg } from './hooks/useCurrentOrg';
import { useObjectiveStats } from './hooks/useObjectiveStats';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { filterCyclesByYearQuarter, hasYearQuarterSelection } from './component/yearQuarterFilter';
const HomeOKRDashboardContent = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'employee'>('employee');
  const [openKeyResults, setOpenKeyResults] = useState<{
    [key: number]: boolean;
  }>({});
  const [filters, setFilters] = useState<OkrFilterState>({
    conditions: [],
    logic: 'and'
  });
  const [yearQuarterSelection, setYearQuarterSelection] = useState<YearQuarterSelection>({
    years: {}
  });
  const {
    organizationId
  } = useCurrentOrg();
  const {
    data: cycles = []
  } = useOkrCycles(organizationId);
  const {
    data: currentEmployee
  } = useCurrentEmployee();

  // Get available years from cycles
  const availableYears = cycles.length > 0 ? cycles.map(c => c.year).filter((year, index, arr) => arr.indexOf(year) === index).sort((a, b) => b - a) : undefined;

  // Get current active cycle ID (prefer active cycle, fallback to most recent)
  const getActiveCycleId = () => {
    if (!cycles.length) {
      // Create a default cycle ID if no cycles exist
      // Reduced logging frequency for performance
      return 'default-cycle-2025-q4';
    }
    
    // First try to find an active cycle
    const activeCycle = cycles.find(cycle => cycle.is_active);
    if (activeCycle) return activeCycle.id;
    
    // Fallback to most recent cycle (first in the ordered list)
    return cycles[0]?.id;
  };

  const activeCycleId = getActiveCycleId();

  // Calculate filtered cycle IDs for stats
  const getFilteredCycleIds = (yearQuarterSelection: YearQuarterSelection) => {
    return hasYearQuarterSelection(yearQuarterSelection) 
      ? filterCyclesByYearQuarter(cycles, yearQuarterSelection)
      : undefined;
  };

  // Get real stats for each objective type
  const companyStats = useObjectiveStats(organizationId, 'company', getFilteredCycleIds(yearQuarterSelection));
  const departmentStats = useObjectiveStats(organizationId, 'department', getFilteredCycleIds(yearQuarterSelection));
  const individualStats = useObjectiveStats(organizationId, 'individual', getFilteredCycleIds(yearQuarterSelection));
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };
  const toggleKeyResults = (index: number) => {
    setOpenKeyResults(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  return <div className="space-y-2 h-full flex flex-col">
      <SectionGreetings currentTime={currentTime} greeting={getGreeting()} />


      {/* OKR Objectives Section */}
      <Card className="border border-border flex-1 flex flex-col overflow-hidden">
        
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="company-objectives" className="w-full h-full flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 mt-4 flex-shrink-0">
              <TabsTrigger value="company-objectives" className="text-sm font-semibold">Company Objective</TabsTrigger>
              <TabsTrigger value="department-objectives" className="text-sm font-semibold">Department Objective</TabsTrigger>
              <TabsTrigger value="individual-objectives" className="text-sm font-semibold">Individual Objective</TabsTrigger>
            </TabsList>

            <TabsContent value="company-objectives" className="space-y-4 mt-4 flex-1 overflow-auto">
              {/* Company Objectives Progress Overview */}
              <CompanyObjectivesProgressCard
                enhancedCompanyObjectives={[]} // Will be populated by ObjectivesTab
                calculateOverallProgress={() => companyStats.data?.avgProgress || 0}
                activeObjectives={[]} // Will be populated by ObjectivesTab
                draftObjectives={[]} // Will be populated by ObjectivesTab
                completedObjectives={[]} // Will be populated by ObjectivesTab
                loading={companyStats.isLoading}
                error={companyStats.error?.message || null}
                organizationId={organizationId}
                yearQuarterSelection={yearQuarterSelection}
                onYearQuarterChange={setYearQuarterSelection}
                availableYears={availableYears}
              />
              
              <ObjectivesTab 
                type="company" 
                title="Company Objectives 2024" 
                icon={Target} 
                iconColor="text-blue-600" 
                userRole={userRole} 
                openKeyResults={openKeyResults} 
                onToggleKeyResults={toggleKeyResults} 
                stats={companyStats.data || { avgProgress: 0, totalObjectives: 0, nextDeadline: "N/A" }}
                filters={filters} 
                onFiltersChange={setFilters} 
                yearQuarterSelection={yearQuarterSelection} 
                onYearQuarterChange={setYearQuarterSelection} 
                availableYears={availableYears} 
              />
            </TabsContent>

            <TabsContent value="department-objectives" className="space-y-4 mt-4 flex-1 overflow-auto">
              {/* Department Objectives Progress Overview */}
              <DepartmentObjectivesProgressCard
                enhancedDepartmentObjectives={[]} // Will be populated by ObjectivesTab
                calculateOverallProgress={() => departmentStats.data?.avgProgress || 0}
                activeObjectives={[]} // Will be populated by ObjectivesTab
                draftObjectives={[]} // Will be populated by ObjectivesTab
                completedObjectives={[]} // Will be populated by ObjectivesTab
                loading={departmentStats.isLoading}
                error={departmentStats.error?.message || null}
                organizationId={organizationId}
                cycleId={activeCycleId}
                departmentId={currentEmployee?.departments?.id || undefined}
                yearQuarterSelection={yearQuarterSelection}
                onYearQuarterChange={setYearQuarterSelection}
                availableYears={availableYears}
              />
              
              <ObjectivesTab 
                type="department" 
                title="Department Objectives" 
                icon={Building} 
                iconColor="text-purple-600" 
                userRole={userRole} 
                openKeyResults={openKeyResults} 
                onToggleKeyResults={toggleKeyResults} 
                stats={departmentStats.data || { avgProgress: 0, totalObjectives: 0, nextDeadline: "N/A" }}
                filters={filters} 
                onFiltersChange={setFilters} 
                yearQuarterSelection={yearQuarterSelection} 
                onYearQuarterChange={setYearQuarterSelection} 
                availableYears={availableYears} 
              />
            </TabsContent>

            <TabsContent value="individual-objectives" className="space-y-4 mt-4 flex-1 overflow-auto">
              {/* Individual Objectives Progress Overview */}
              <IndividualObjectivesProgressCard
                enhancedIndividualObjectives={[]} // Will be populated by ObjectivesTab
                calculateOverallProgress={() => individualStats.data?.avgProgress || 0}
                activeObjectives={[]} // Will be populated by ObjectivesTab
                draftObjectives={[]} // Will be populated by ObjectivesTab
                completedObjectives={[]} // Will be populated by ObjectivesTab
                loading={individualStats.isLoading}
                error={individualStats.error?.message || null}
                organizationId={organizationId}
                cycleId={activeCycleId}
                yearQuarterSelection={yearQuarterSelection}
                onYearQuarterChange={setYearQuarterSelection}
                availableYears={availableYears}
              />
              
              <ObjectivesTab 
                type="individual" 
                title="My Individual Objectives" 
                icon={User} 
                iconColor="text-green-600" 
                userRole={userRole} 
                openKeyResults={openKeyResults} 
                onToggleKeyResults={toggleKeyResults} 
                stats={individualStats.data || { avgProgress: 0, totalObjectives: 0, nextDeadline: "N/A" }}
                filters={filters} 
                onFiltersChange={setFilters} 
                yearQuarterSelection={yearQuarterSelection} 
                onYearQuarterChange={setYearQuarterSelection} 
                availableYears={availableYears} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export const HomeOKRDashboard = () => {
  return <AttendanceStatusProvider>
      <HomeOKRDashboardContent />
    </AttendanceStatusProvider>;
};