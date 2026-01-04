import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section/HeaderAndTab';
import { OKRSidebar } from './section/OKRSidebar';
import { OKRSidebarFooter } from './section/OKRSidebarFooter';
import { Card, CardContent } from '@/features/ui/card';
import { CompanyObjectivesProgressCard } from '@/features/1_home/components/HomeOKRDashboard/component/CompanyObjectivesProgressCard';
import { DepartmentObjectivesProgressCard } from '@/features/1_home/components/HomeOKRDashboard/component/DepartmentObjectivesProgressCard';
import { IndividualObjectivesProgressCard } from '@/features/1_home/components/HomeOKRDashboard/component/IndividualObjectivesProgressCard';
import { CompanyObjectivesDetailView } from '@/features/1_home/components/HomeOKRDashboard/component/ObjectivesTabImport/CompanyObjectivesDetailView';
import { DepartmentObjectivesView } from '@/features/1_home/components/HomeOKRDashboard/component/ObjectivesTabImport/DepartmentObjectivesView';
import { IndividualObjectivesView } from '@/features/1_home/components/HomeOKRDashboard/component/ObjectivesTabImport/IndividualObjectivesView';
import { useOkrCycles } from '@/features/1_home/components/HomeOKRDashboard/hooks/useOkrCycles';
import { useCurrentOrg } from '@/features/1_home/components/HomeOKRDashboard/hooks/useCurrentOrg';
import { useObjectiveStats } from '@/features/1_home/components/HomeOKRDashboard/hooks/useObjectiveStats';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { filterCyclesByYearQuarter, hasYearQuarterSelection } from '@/features/1_home/components/HomeOKRDashboard/component/yearQuarterFilter';
import type { YearQuarterSelection } from '@/features/1_home/components/HomeOKRDashboard/component/FiturTimePeriod';
import { AttendanceStatusProvider } from '@/features/1_home/components/HomeOKRDashboard/component/AttendanceStatusProvider';

const OKRPageContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { organizationId } = useCurrentOrg();
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: cycles = [], isLoading: isLoadingCycles } = useOkrCycles(organizationId);
  
  // Get active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/department-objective')) return 'department-objectives';
    if (location.pathname.includes('/individual-objective')) return 'individual-objectives';
    return 'company-objectives'; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());
  const [yearQuarterSelection, setYearQuarterSelection] = useState<YearQuarterSelection>({ years: {} });

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Get available years from cycles
  const availableYears = cycles.length > 0 
    ? cycles.map(c => c.year).filter((year, index, arr) => arr.indexOf(year) === index).sort((a, b) => b - a) 
    : undefined;

  // Get current active cycle ID
  const getActiveCycleId = () => {
    if (!cycles.length) return undefined; // Return undefined instead of invalid UUID
    const activeCycle = cycles.find(cycle => cycle.is_active);
    if (activeCycle) return activeCycle.id;
    return cycles[0]?.id;
  };

  const activeCycleId = getActiveCycleId();

  // Calculate filtered cycle IDs for stats
  const getFilteredCycleIds = (yearQuarterSelection: YearQuarterSelection) => {
    return hasYearQuarterSelection(yearQuarterSelection) 
      ? filterCyclesByYearQuarter(cycles, yearQuarterSelection)
      : undefined;
  };

  // Get stats for each objective type
  const companyStats = useObjectiveStats(organizationId, 'company', getFilteredCycleIds(yearQuarterSelection));
  const departmentStats = useObjectiveStats(organizationId, 'department', getFilteredCycleIds(yearQuarterSelection));
  const individualStats = useObjectiveStats(organizationId, 'individual', getFilteredCycleIds(yearQuarterSelection));

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Navigate to corresponding route
    if (tab === 'department-objectives') {
      navigate('/okr/department-objective');
    } else if (tab === 'individual-objectives') {
      navigate('/okr/individual-objective');
    } else {
      navigate('/okr/company-objective');
    }
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
                <div className="col-span-9 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                      {/* OKR Content */}
                      <div className="flex-1 flex flex-col overflow-hidden p-4">
                        <Card className="border border-border flex-1 flex flex-col overflow-hidden">
                          <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="w-full h-full flex flex-col overflow-hidden">
                              {activeTab === 'company-objectives' && (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll max-h-[calc(100vh-120px)]">
                                  <CompanyObjectivesProgressCard
                                    enhancedCompanyObjectives={[]}
                                    calculateOverallProgress={() => companyStats.data?.avgProgress || 0}
                                    activeObjectives={[]}
                                    draftObjectives={[]}
                                    completedObjectives={[]}
                                    loading={companyStats.isLoading}
                                    error={companyStats.error?.message || null}
                                    stats={companyStats.data}
                                    organizationId={organizationId}
                                    yearQuarterSelection={yearQuarterSelection}
                                    onYearQuarterChange={setYearQuarterSelection}
                                    availableYears={availableYears}
                                    isLoadingCycles={isLoadingCycles}
                                  />
                                  
                                  <CompanyObjectivesDetailView 
                                    organizationId={organizationId}
                                    yearQuarterSelection={yearQuarterSelection}
                                    onYearQuarterChange={setYearQuarterSelection}
                                  />
                                </div>
                              )}

                              {activeTab === 'department-objectives' && (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll">
                                  <DepartmentObjectivesProgressCard
                                    enhancedDepartmentObjectives={[]}
                                    calculateOverallProgress={() => departmentStats.data?.avgProgress || 0}
                                    activeObjectives={[]}
                                    draftObjectives={[]}
                                    completedObjectives={[]}
                                    loading={departmentStats.isLoading}
                                    error={departmentStats.error?.message || null}
                                    organizationId={organizationId}
                                    cycleId={activeCycleId}
                                    departmentId={currentEmployee?.departments?.id || undefined}
                                    yearQuarterSelection={yearQuarterSelection}
                                    onYearQuarterChange={setYearQuarterSelection}
                                    availableYears={availableYears}
                                    isLoadingCycles={isLoadingCycles}
                                  />
                                  
                                  <DepartmentObjectivesView 
                                    organizationId={organizationId}
                                    cycleId={activeCycleId}
                                    cycleIds={getFilteredCycleIds(yearQuarterSelection)}
                                  />
                                </div>
                              )}

                              {activeTab === 'individual-objectives' && (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll">
                                  <IndividualObjectivesProgressCard
                                    enhancedIndividualObjectives={[]}
                                    calculateOverallProgress={() => individualStats.data?.avgProgress || 0}
                                    activeObjectives={[]}
                                    draftObjectives={[]}
                                    completedObjectives={[]}
                                    loading={individualStats.isLoading}
                                    error={individualStats.error?.message || null}
                                    organizationId={organizationId}
                                    cycleId={activeCycleId}
                                    yearQuarterSelection={yearQuarterSelection}
                                    onYearQuarterChange={setYearQuarterSelection}
                                    availableYears={availableYears}
                                    isLoadingCycles={isLoadingCycles}
                                  />
                                  
                                  <IndividualObjectivesView 
                                    organizationId={organizationId}
                                    cycleId={activeCycleId}
                                    cycleIds={getFilteredCycleIds(yearQuarterSelection)}
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sidebar - 3 columns */}
                <div className="col-span-3 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-120px)]">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">OKR Overview</h3>
                            <p className="text-xs text-gray-500 mt-1">Summary and insights</p>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full p-4 seamless-scroll overflow-y-auto">
                          <OKRSidebar 
                            activeTab={activeTab}
                            organizationId={organizationId}
                            companyStats={companyStats.data}
                            departmentStats={departmentStats.data}
                            individualStats={individualStats.data}
                            cycleIds={getFilteredCycleIds(yearQuarterSelection)}
                          />
                        </div>
                      </div>

                      {/* Sidebar Footer */}
                      <OKRSidebarFooter 
                        totalCycles={cycles.length}
                        activeCycleId={activeCycleId}
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

export const OKRPage = () => {
  return (
    <AttendanceStatusProvider>
      <OKRPageContent />
    </AttendanceStatusProvider>
  );
};

export default OKRPage;

