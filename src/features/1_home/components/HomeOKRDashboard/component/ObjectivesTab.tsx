import React from 'react';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Settings, Target, Building, User, Plus } from 'lucide-react';
// ObjectivesList removed - using existing components instead
import { DepartmentObjectivesView } from './ObjectivesTabImport/DepartmentObjectivesView';
import { IndividualObjectivesView } from './ObjectivesTabImport/IndividualObjectivesView';
import { CompanyObjectivesDetailView } from './ObjectivesTabImport/CompanyObjectivesDetailView';
// TODO: Update to use specific contribution modals
// import { ModalCreateObjective } from '../components/ModalCreateObjective';
import { useOkrCycles } from './ObjectivesTabImport/useOkrCycles';
import { useObjectives } from './ObjectivesTabImport/useObjectives';
import { useFilteredObjectives } from './ObjectivesTabImport/useFilteredObjectives';
import { getDefaultCycleForCurrentPeriod } from './ObjectivesTabImport/okrUtils';
import { useProfile } from './ObjectivesTabImport/useProfile';
import { useCurrentOrg } from '../hooks/useCurrentOrg';
import { HomeCycleSelector } from './ObjectivesTabImport/HomeCycleSelector';
import { FiturTimePeriod, YearQuarterSelection } from './FiturTimePeriod';
import { filterCyclesByYearQuarter, hasYearQuarterSelection, getYearQuarterSummary } from './yearQuarterFilter';
import type { OkrFilterState } from '../../types/okr-filter';

interface ObjectivesTabProps {
  type: 'company' | 'department' | 'individual';
  title: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  userRole: string;
  openKeyResults: { [key: number]: boolean };
  onToggleKeyResults: (index: number) => void;
  stats: {
    avgProgress: number;
    totalObjectives: number;
    nextDeadline: string;
  };
  filters?: OkrFilterState;
  onFiltersChange?: (filters: OkrFilterState) => void;
  yearQuarterSelection?: YearQuarterSelection;
  onYearQuarterChange?: (selection: YearQuarterSelection) => void;
  availableYears?: number[];
}

export const ObjectivesTab = ({
  type,
  title,
  icon: Icon,
  iconColor,
  userRole,
  openKeyResults,
  onToggleKeyResults,
  stats,
  filters = { conditions: [], logic: 'and' },
  onFiltersChange = () => {},
  yearQuarterSelection = { years: {} },
  onYearQuarterChange = () => {},
  availableYears,
}: ObjectivesTabProps) => {
  const { data: profile } = useProfile();
  const { organizationId } = useCurrentOrg();

  const [selectedCycleId, setSelectedCycleId] = React.useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  // Hooks
  const { data: okrCycles = [] } = useOkrCycles(organizationId);
  
  // Calculate filtered cycle IDs based on year-quarter selection
  const filteredCycleIds = React.useMemo(() => {
    // Removed excessive debug logging for performance
    
    if (!hasYearQuarterSelection(yearQuarterSelection)) {
      return [];
    }
    return filterCyclesByYearQuarter(okrCycles, yearQuarterSelection);
  }, [okrCycles, yearQuarterSelection]);

  // Use filtered cycles or single cycle for objectives query
  const hasMultipleCycles = filteredCycleIds.length > 0;
  const singleCycleId = hasMultipleCycles ? undefined : selectedCycleId;
  
  // Use different hooks based on filtering type
  // Note: For individual objectives, we don't use these hooks as IndividualObjectivesView handles its own data fetching
  const singleObjectivesQuery = useObjectives(
    organizationId, 
    singleCycleId, 
    type === 'department' ? undefined : (type === 'individual' ? undefined : type)
  );
  
  const multiObjectivesQuery = useFilteredObjectives(
    organizationId,
    hasMultipleCycles ? filteredCycleIds : undefined,
    type === 'department' ? undefined : (type === 'individual' ? undefined : type)
  );

  // Choose the appropriate query result
  // For individual objectives, these queries are not used as IndividualObjectivesView handles its own data fetching
  const { objectives = [], refetch: refetchObjectives } = hasMultipleCycles 
    ? multiObjectivesQuery 
    : singleObjectivesQuery;

  // Set default cycle when cycles are loaded
  React.useEffect(() => {
    if (okrCycles.length > 0 && !selectedCycleId && filteredCycleIds.length === 0) {
      const defaultCycleId = getDefaultCycleForCurrentPeriod(okrCycles);
      if (defaultCycleId) {
        setSelectedCycleId(defaultCycleId);
      }
    }
  }, [okrCycles, selectedCycleId, filteredCycleIds]);

  // Generate dynamic title based on selection
  const getDynamicTitle = () => {
    if (hasYearQuarterSelection(yearQuarterSelection)) {
      const summary = getYearQuarterSummary(yearQuarterSelection);
      return `${type === 'company' ? 'Company' : type === 'department' ? 'Department' : 'Individual'} Objectives - ${summary}`;
    }
    
    // Fallback to selected cycle name if available
    if (selectedCycleId) {
      const selectedCycle = okrCycles.find(cycle => cycle.id === selectedCycleId);
      if (selectedCycle) {
        return `${type === 'company' ? 'Company' : type === 'department' ? 'Department' : 'Individual'} Objectives - ${selectedCycle.name}`;
      }
    }
    
    return title; // Original title as fallback
  };

  const getStatsColor = () => {
    switch (type) {
      case 'company': return 'blue';
      case 'department': return 'purple';
      case 'individual': return 'green';
    }
  };

  const handleObjectiveAdded = () => {
    refetchObjectives();
  };

  // Special handling for company objectives - use new CompanyObjectivesDetailView
  if (type === 'company' && organizationId) {
    return (
      <div className="space-y-4 h-full w-full flex flex-col overflow-hidden">
        
        {/* TODO: Update to use specific contribution modals */}
        {/* {showCreateDialog && organizationId && (
          <ModalCreateObjective 
            open={showCreateDialog} 
            onOpenChange={setShowCreateDialog} 
            level={type}
            organizationId={organizationId} 
            cycleId={filteredCycleIds?.[0] || selectedCycleId}
            onSuccess={handleObjectiveAdded}
          />
        )} */}
        
        
        {hasYearQuarterSelection(yearQuarterSelection) ? (
          <div className="flex-1 overflow-auto">
            <CompanyObjectivesDetailView 
              organizationId={organizationId}
              cycleId={hasMultipleCycles ? undefined : selectedCycleId}
              cycleIds={hasMultipleCycles ? filteredCycleIds : undefined}
              yearQuarterSelection={yearQuarterSelection}
              onYearQuarterChange={onYearQuarterChange}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
            <p>Please select a time period to view objectives</p>
          </div>
        )}

      </div>
    );
  }

  // Special handling for department objectives
  if (type === 'department' && organizationId) {
    return (
      <div className="space-y-4 h-full w-full flex flex-col">
        <div className="flex-1">
          <DepartmentObjectivesView 
            organizationId={organizationId}
            cycleId={hasMultipleCycles ? undefined : selectedCycleId || undefined}
            cycleIds={hasMultipleCycles ? filteredCycleIds : undefined}
          />
        </div>
      </div>
    );
  }

  // Special handling for individual objectives - show employee list
  if (type === 'individual' && organizationId) {
    return (
      <div className="space-y-4 h-full w-full flex flex-col">
        <div className="flex-1">
          <IndividualObjectivesView 
            organizationId={organizationId}
            cycleId={hasMultipleCycles ? undefined : selectedCycleId || undefined}
            cycleIds={hasMultipleCycles ? filteredCycleIds : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Objectives content - using existing components */}
      {type === 'company' && <CompanyObjectivesDetailView organizationId={organizationId} />}
      {type === 'department' && <DepartmentObjectivesView organizationId={organizationId} />}
      {type === 'individual' && <IndividualObjectivesView organizationId={organizationId} />}

    </div>
  );
};