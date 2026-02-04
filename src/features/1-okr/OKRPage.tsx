import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section/HeaderAndTab';
import { OKRSidebar } from './section/OKRSidebar';
import { OKRSidebarFooter } from './section/OKRSidebarFooter';
import { Card, CardContent } from '@/features/ui/card';
import { LoadingDots } from '@/components/LoadingDots';
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
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
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
  // Default to current year + current quarter so one consistent fetch (avoids empty → default update and double fetch/flicker)
  const [yearQuarterSelection, setYearQuarterSelection] = useState<YearQuarterSelection>(() => {
    const y = new Date().getFullYear().toString();
    const m = new Date().getMonth() + 1;
    const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
    return { years: { [y]: { selected: false, quarters: { [q]: true } } } };
  });

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

  // Calculate filtered cycle IDs for stats only after cycles have loaded (avoids 0→real flicker)
  const getFilteredCycleIds = (yearQuarterSelection: YearQuarterSelection) => {
    return hasYearQuarterSelection(yearQuarterSelection) 
      ? filterCyclesByYearQuarter(cycles, yearQuarterSelection)
      : undefined;
  };
  const filteredCycleIds = !isLoadingCycles && cycles.length > 0 ? getFilteredCycleIds(yearQuarterSelection) : undefined;
  // Fallback: jika filter kosong (year/quarter tidak match), pakai semua cycle agar stats terisi dan tidak ada "No valid cycle IDs"
  const cycleIdsForStats =
    filteredCycleIds && filteredCycleIds.length > 0
      ? filteredCycleIds
      : cycles.length > 0
        ? cycles.map((c) => c.id)
        : undefined;
  const statsEnabled = !!organizationId && !isLoadingCycles;

  // Get stats for each objective type (disabled until cycles loaded to prevent flicker)
  const companyStats = useObjectiveStats(organizationId, 'company', cycleIdsForStats, statsEnabled);
  const departmentStats = useObjectiveStats(organizationId, 'department', cycleIdsForStats, statsEnabled);
  const individualStats = useObjectiveStats(organizationId, 'individual', cycleIdsForStats, statsEnabled);

  // Satu loading state: jangan tampilkan sampai org + cycles + stats siap (cegah konten kosong lalu loading lagi setelah remount)
  const companyReady = !!organizationId && !isLoadingCycles && !companyStats.isLoading;
  const departmentReady = !!organizationId && !isLoadingCycles && !departmentStats.isLoading;
  const individualReady = !!organizationId && !isLoadingCycles && !individualStats.isLoading;
  const pageReady =
    (activeTab === 'company-objectives' && companyReady) ||
    (activeTab === 'department-objectives' && departmentReady) ||
    (activeTab === 'individual-objectives' && individualReady);

  // #region agent log
  if (typeof fetch !== 'undefined' && location.pathname.startsWith('/okr')) {
    const branch = !pageReady ? 'loading' : 'content';
    fetch('http://127.0.0.1:7242/ingest/c9a4cb8d-4352-4f3a-94df-51991f6f2fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'OKRPage.tsx:render', message: 'OKR render', data: { renderCount: renderCountRef.current, pathname: location.pathname, activeTab, pageReady, branch, isLoadingCycles, companyStatsLoading: companyStats.isLoading, departmentStatsLoading: departmentStats.isLoading, individualStatsLoading: individualStats.isLoading, companyReady, departmentReady, individualReady, statsEnabled, hasOrgId: !!organizationId, cyclesLen: cycles.length, filteredCycleIdsLen: filteredCycleIds?.length ?? null }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1,H2,H3,H4,H5' }) }).catch(() => {});
  }
  // #endregion

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

  // Satu pohon: StandardLayout (header + sidebar) tetap mounted, hanya isi yang ganti loading/content
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        {!pageReady ? (
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <LoadingDots size="lg" />
          </div>
        ) : (
        <>
        <div className="flex flex-1 min-h-0">
          {/* Main Content - semua baru ditampilkan setelah pageReady */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                      <div className="flex-1 flex flex-col overflow-hidden p-4">
                        <Card className="border border-border flex-1 flex flex-col overflow-hidden">
                          <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="w-full h-full flex flex-col overflow-hidden">
                              {activeTab === 'company-objectives' ? (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll max-h-[calc(100vh-120px)]">
                                  <div>
                                    <CompanyObjectivesProgressCard
                                        enhancedCompanyObjectives={[]}
                                        calculateOverallProgress={() => companyStats.data?.avgProgress || 0}
                                        activeObjectives={[]}
                                        draftObjectives={[]}
                                        completedObjectives={[]}
                                        loading={false}
                                        error={companyStats.error?.message || null}
                                        stats={companyStats.data}
                                        organizationId={organizationId}
                                        yearQuarterSelection={yearQuarterSelection}
                                        onYearQuarterChange={setYearQuarterSelection}
                                        availableYears={availableYears}
                                        isLoadingCycles={false}
                                      />
                                      <CompanyObjectivesDetailView 
                                        organizationId={organizationId}
                                        yearQuarterSelection={yearQuarterSelection}
                                        onYearQuarterChange={setYearQuarterSelection}
                                      />
                                    </div>
                                </div>
                              ) : activeTab === 'department-objectives' ? (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll max-h-[calc(100vh-120px)]">
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
                                    cycleIds={filteredCycleIds ?? []}
                                  />
                                </div>
                              ) : (
                                <div className="space-y-4 mt-4 flex-1 overflow-auto seamless-scroll max-h-[calc(100vh-120px)]">
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
                                    cycleIds={filteredCycleIds ?? []}
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
                
                {/* Sidebar - 3 columns (single load like social-media dashboard, no blink) */}
                <div className="col-span-3 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-120px)]">
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">OKR Overview</h3>
                            <p className="text-xs text-gray-500 mt-1">Summary and insights</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full p-4 seamless-scroll overflow-y-auto">
                          <OKRSidebar 
                            activeTab={activeTab}
                            organizationId={organizationId}
                            companyStats={companyStats.data}
                            departmentStats={departmentStats.data}
                            individualStats={individualStats.data}
                            cycleIds={filteredCycleIds ?? []}
                          />
                        </div>
                      </div>

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
        </>
        )}
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

