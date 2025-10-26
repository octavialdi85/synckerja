import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Progress } from '@/features/ui/progress';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Building, Plus, Target, ChevronRight, ChevronDown, CheckCircle, Users, TrendingUp, Calendar, BarChart3, Trash2 } from 'lucide-react';
import { useObjectives } from './useObjectives';
import { useFilteredObjectives } from './useFilteredObjectives';
import { useDeleteCompanyObjective } from '../../hooks/useDeleteCompanyObjective';
import { useDepartmentObjectivesList } from './CompanyObjectivesDetailViewImport/useDepartmentObjectivesList';
import { useIndividualObjectives } from '../../modal/useIndividualObjectives';
import { useDepartments } from './CompanyObjectivesDetailViewImport/useDepartments';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentOrg } from '../../hooks/useCurrentOrg';
import { useOkrCycles } from './useOkrCycles';
import { YearQuarterSelection } from '../FiturTimePeriod';
import { filterCyclesByYearQuarter, hasYearQuarterSelection } from '../yearQuarterFilter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
// import { WeeklyCheckinForm } from './CompanyObjectivesDetailViewImport/WeeklyCheckinDialog';
import { ObjectiveCheckinForm } from './CompanyObjectivesDetailViewImport/ObjectiveCheckinForm';
// TODO: Update to use ModalAddCompanyContribution
// import { ModalCreateObjective } from '../components/ModalCreateObjective';
import { CreateKeyResultDialog } from './CompanyObjectivesDetailViewImport/CreateKeyResultDialog';
import { KeyResultApprovalButtons } from './CompanyObjectivesDetailViewImport/KeyResultApprovalButtons';
import { SectionActiveObjectives } from './CompanyObjectivesDetailViewImport/SectionActiveObjectives';
import { SectionDraftObjectives } from './CompanyObjectivesDetailViewImport/SectionDraftObjectives';
import { SectionCompletedObjectives } from './CompanyObjectivesDetailViewImport/SectionCompletedObjectives';
interface CompanyObjectivesViewProps {
  organizationId: string;
  cycleId?: string;
  cycleIds?: string[]; // Support for multiple cycle IDs
}
export const CompanyObjectivesDetailView = ({
  organizationId,
  cycleId,
  cycleIds
}: CompanyObjectivesViewProps) => {
  const [expandedObjective, setExpandedObjective] = useState<string | undefined>(undefined);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedIndividualObjectives, setExpandedIndividualObjectives] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createKRDialog, setCreateKRDialog] = useState<{
    open: boolean;
    objective?: any;
  }>({
    open: false
  });
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // State for period selector and dropdown
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  
  // Real data from Supabase
  const [yearQuarterSelection, setYearQuarterSelection] = useState<YearQuarterSelection>({
    years: {}
  });
  
  const {
    organizationId: currentOrgId
  } = useCurrentOrg();
  
  const {
    data: cycles = []
  } = useOkrCycles(organizationId);

  // Get available years from cycles
  const availableYears = cycles.length > 0 ? cycles.map(c => c.year).filter((year, index, arr) => arr.indexOf(year) === index).sort((a, b) => b - a) : undefined;

  const onYearQuarterChange = (selection: YearQuarterSelection) => {
    console.log('🟠 SectionMainCompanyObjectives - Year quarter selection changed:', selection);
    setYearQuarterSelection(selection);
  };

  // Calculate filtered cycle IDs for objectives - same as AttendanceSection.tsx
  const getFilteredCycleIds = (yearQuarterSelection: YearQuarterSelection) => {
    return hasYearQuarterSelection(yearQuarterSelection) 
      ? filterCyclesByYearQuarter(cycles, yearQuarterSelection)
      : undefined;
  };

  // Get filtered cycle IDs based on current selection
  const filteredCycleIds = getFilteredCycleIds(yearQuarterSelection);
  
  // Removed excessive debug logging for performance
  const getDynamicTitle = () => 'Company Objectives - Q3 2025';
  const loading = false;
  const error = null;
  const onToggleQuarterDropdown = () => setShowQuarterDropdown(!showQuarterDropdown);
  const getDisplayText = () => 'Q3 2025';
  const onClearAll = () => setSelectedQuarters([]);
  const quarters = [
    { id: 'q1-2025', label: 'Q1 2025' },
    { id: 'q2-2025', label: 'Q2 2025' },
    { id: 'q3-2025', label: 'Q3 2025' },
    { id: 'q4-2025', label: 'Q4 2025' }
  ];
  const onQuarterToggle = (quarterId: string) => {
    console.log('onQuarterToggle called with:', quarterId);
    setSelectedQuarters(prev => {
      const newSelection = prev.includes(quarterId) 
        ? prev.filter(id => id !== quarterId)
        : [...prev, quarterId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };
  const onToggleYear = (year: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // Use filtered cycle IDs for objectives - same as AttendanceSection.tsx
  const shouldUseFilteredObjectives = filteredCycleIds && filteredCycleIds.length > 0;
  
  // For single cycle, use existing hook
  const singleObjectivesQuery = useObjectives(organizationId, shouldUseFilteredObjectives ? undefined : cycleId || undefined);
  
  // For multiple cycles, use filtered hook with proper cycle IDs array
  const filteredObjectivesQuery = useFilteredObjectives(organizationId, shouldUseFilteredObjectives ? filteredCycleIds : undefined);

  // Choose the appropriate query result
  const {
    objectives: companyObjectives = [],
    isLoading: loadingObjectives
  } = shouldUseFilteredObjectives ? filteredObjectivesQuery : singleObjectivesQuery;
  const {
    departments = [],
    isLoading: loadingDepartments
  } = useDepartments(organizationId);
  const {
    user: currentUser
  } = useCurrentUser();

  // Use the actual delete hook
  const deleteCompanyObjective = useDeleteCompanyObjective();

  // Fetch department objectives from department_objectives table - use filtered cycle IDs
  const {
    data: departmentObjectives = [],
    isLoading: loadingDepartmentObjectives
  } = useDepartmentObjectivesList(organizationId, filteredCycleIds);

  // Fetch individual objectives from individual_objectives table - use filtered cycle IDs
  const {
    data: individualObjectives = [],
    isLoading: loadingIndividualObjectives
  } = useIndividualObjectives(organizationId, filteredCycleIds);
  const allObjectives: any[] = [];
  const loadingAllObjectives = loadingDepartmentObjectives || loadingIndividualObjectives;

  // Helper function to get department name
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  // Helper function to get department objectives for a company objective
  const getDepartmentObjectives = (companyObjective: any) => {
    return allObjectives.filter(obj => obj.parent_objective_id === companyObjective.id && obj.level === 'department');
  };

  // Helper function to get individual objectives for a department objective  
  const getIndividualObjectivesForDepartment = (departmentObjectiveId: string) => {
    return individualObjectives.filter(indObj => indObj.department_objective_id === departmentObjectiveId);
  };

  // Helper function to toggle individual objectives expansion
  const toggleIndividualObjectives = (departmentObjectiveId: string) => {
    const newExpanded = new Set(expandedIndividualObjectives);
    if (newExpanded.has(departmentObjectiveId)) {
      newExpanded.delete(departmentObjectiveId);
    } else {
      newExpanded.add(departmentObjectiveId);
    }
    setExpandedIndividualObjectives(newExpanded);
  };

  // Helper function to collect department objectives only (not key_results)
  const getRelatedKeyResults = (companyObjective: any) => {
    // Only get department objectives from department_objectives table
    const relatedDepartmentObjectives = departmentObjectives.filter(deptObj => deptObj.company_objective_id === companyObjective.id);

    // Convert department objectives to key result format for display
    const departmentKRs = relatedDepartmentObjectives.map((deptObj: any) => ({
      id: deptObj.id,
      title: deptObj.title,
      description: deptObj.description,
      current_value: deptObj.progress_percentage || 0,
      target_value: 100,
      start_value: 0,
      unit: '%',
      progress_percentage: deptObj.progress_percentage || 0,
      metric_type: 'percentage',
      weight: deptObj.weight || 100,
      source_type: 'department_objective',
      department_id: deptObj.department_id,
      department_name: getDepartmentName(deptObj.department_id),
      why_important: deptObj.why_important,
      owner_id: deptObj.owner_id,
      status: deptObj.status
    }));
    return departmentKRs;
  };

  // Enhance company objectives with all related key results
  const enhancedCompanyObjectives = companyObjectives.map(objective => ({
    ...objective,
    all_key_results: getRelatedKeyResults(objective)
  }));

  // Helper function to get actual progress from current_value/target_value
  const getActualProgress = (keyResult: any): number => {
    if (!keyResult || !keyResult.target_value || keyResult.target_value === 0) {
      return 0;
    }
    const startValue = keyResult.start_value || 0;
    const currentValue = keyResult.current_value || 0;
    const targetValue = keyResult.target_value;

    // Calculate progress percentage
    const totalRange = targetValue - startValue;
    const achievedRange = currentValue - startValue;
    if (totalRange <= 0) return 0;
    const progress = keyResult.is_inverse ? Math.max(0, Math.min(100, (startValue - currentValue) / (startValue - targetValue) * 100)) : Math.max(0, Math.min(100, achievedRange / totalRange * 100));
    return Math.round(progress);
  };

  // Helper function to check if objective has actual progress
  const hasActualProgress = (objective: any) => {
    if (!objective.key_results || objective.key_results.length === 0) {
      return false;
    }

    // Check if any key result has progress > 0
    return objective.key_results.some((kr: any) => {
      const actualProgress = getActualProgress(kr);
      return actualProgress > 0 || kr.current_value > 0;
    });
  };
  // Remove this function - accordion behavior will be handled by Accordion component
  const getObjectivesByStatus = (status: string) => {
    return enhancedCompanyObjectives.filter(obj => obj.status === status);
  };
  const handleCreateKR = (objective: any) => {
    setCreateKRDialog({
      open: true,
      objective
    });
  };

  const handleDeleteObjective = (e: React.MouseEvent, objectiveId: string, objectiveTitle: string) => {
    e.stopPropagation(); // Prevent accordion toggle
    
    const confirmMessage = `Are you sure you want to delete "${objectiveTitle}"?\n\nThis action cannot be undone and will also remove all associated department objectives, key results, and progress data.`;
    
    if (confirm(confirmMessage)) {
      console.log('🗑️ User confirmed deletion of company objective:', { objectiveId, objectiveTitle });
      deleteCompanyObjective.mutate(objectiveId);
    }
  };
  if (loadingObjectives || loadingDepartments || loadingAllObjectives) {
    return <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-xs text-gray-600 leading-relaxed">Loading objectives...</p>
        </div>
      </div>;
  }
  if (companyObjectives.length === 0) {
    return <div className="relative text-center p-6 bg-gray-50 rounded-lg h-full w-full flex flex-col items-center justify-center min-h-[400px] max-h-full overflow-hidden">
        <Target className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-2 leading-normal">No Company Objectives Found</h3>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed max-w-md">Create company objectives to align your organization's strategic goals.</p>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Objective
        </Button>
        
        {/* TODO: Update to use ModalAddCompanyContribution */}
        {/* <ModalCreateObjective open={showCreateDialog} onOpenChange={setShowCreateDialog} organizationId={organizationId} entityId={organizationId} entityName="Company" cycleId={cycleId} /> */}
      </div>;
  }

  // Calculate overall company progress
  const calculateOverallProgress = () => {
    if (enhancedCompanyObjectives.length === 0) return 0;
    const totalProgress = enhancedCompanyObjectives.reduce((sum, obj) => {
      if (obj.all_key_results && obj.all_key_results.length > 0) {
        const objProgress = obj.all_key_results.reduce((krSum, kr) => krSum + (kr.progress_percentage || 0), 0) / obj.all_key_results.length;
        return sum + objProgress;
      }
      return sum;
    }, 0);
    return Math.round(totalProgress / enhancedCompanyObjectives.length);
  };
  const activeObjectives = getObjectivesByStatus('active');
  const draftObjectives = getObjectivesByStatus('draft');
  const completedObjectives = getObjectivesByStatus('completed');
  const renderObjectiveCard = (objective: any, status: string, borderColor: string, iconColor: string) => {
    // Calculate the actual progress using current_value vs target_value from key results
    const actualProgress = objective.key_results && objective.key_results.length > 0 ? Math.round(objective.key_results.reduce((sum: number, kr: any) => sum + getActualProgress(kr), 0) / objective.key_results.length) : 0;
    
    return (
      <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-2 last:mb-0`}>
        <AccordionTrigger className="py-3 px-4 hover:bg-gray-50 transition-colors [&[data-state=open]>div>div:first-child>svg]:rotate-180">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 flex-1">
              <Target className={`h-4 w-4 ${iconColor}`} />
              <span className="text-sm font-medium text-gray-900 truncate text-left leading-normal">
                {objective.title}
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 mr-3">
              <Badge variant="outline" className="text-xs font-medium leading-tight">
                {objective.all_key_results?.length || 0} KRs
              </Badge>
              <Badge variant="outline" className={`text-xs font-medium leading-tight ${status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Completed'}
              </Badge>
              {status !== 'draft' && hasActualProgress(objective) && (
                <div className="text-xs text-gray-500 min-w-[3rem] text-right leading-normal">
                  {actualProgress}%
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteObjective(e, objective.id, objective.title)}
                disabled={deleteCompanyObjective.isPending}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                title={deleteCompanyObjective.isPending ? 'Deleting...' : 'Delete objective'}
              >
                {deleteCompanyObjective.isPending ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        
        {/* Average Progress Bar moved outside trigger */}
        {objective.all_key_results && objective.all_key_results.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-600 font-medium">Average Progress</span>
              <span className="font-medium text-blue-600">
                {Math.round(objective.all_key_results.reduce((sum, kr) => sum + (kr.progress_percentage || 0), 0) / objective.all_key_results.length)}%
              </span>
            </div>
            <Progress value={objective.all_key_results.reduce((sum, kr) => sum + (kr.progress_percentage || 0), 0) / objective.all_key_results.length} className="h-2" />
            
            {/* Why this is important section */}
            {objective.why_important && (
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <h5 className="font-medium text-xs text-blue-900 mb-1 uppercase tracking-wide">
                  Why this is important:
                </h5>
                <p className="text-sm text-blue-800">
                  {objective.why_important}
                </p>
              </div>
            )}
          </div>
        )}
        
        <AccordionContent className="px-4 pb-4">
          {objective.description && (
            <p className="text-sm text-gray-600 mb-3">
              {objective.description}
            </p>
          )}

          {status !== 'draft' && hasActualProgress(objective) && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className={`font-medium ${status === 'completed' ? 'text-green-600' : ''}`}>
                  {status === 'completed' ? '100%' : `${actualProgress}%`}
                </span>
              </div>
              <Progress value={status === 'completed' ? 100 : actualProgress} className="h-2" />
            </div>
          )}
          
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Key Results
              </h4>
              <Button variant="outline" size="sm" onClick={() => handleCreateKR(objective)} className="h-7 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add KR
              </Button>
            </div>
            
            {/* Display All Key Results (Company + Department Objectives) */}
            {objective.all_key_results && objective.all_key_results.length > 0 && (
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-2">
                {objective.all_key_results.map((kr: any) => {
                  const actualKRProgress = getActualProgress(kr);
                  const isDepartmentObjective = kr.source_type === 'department_objective';
                  const bgColor = isDepartmentObjective ? 'bg-green-50' : 'bg-blue-50';
                  const borderColor = isDepartmentObjective ? 'border-green-200' : 'border-blue-200';
                  const iconColor = isDepartmentObjective ? 'text-green-600' : 'text-blue-600';
                  const textColor = isDepartmentObjective ? 'text-green-900' : 'text-blue-900';
                  const labelColor = isDepartmentObjective ? 'text-green-700' : 'text-blue-700';
                  const relatedIndividualObjectives = isDepartmentObjective ? getIndividualObjectivesForDepartment(kr.id) : [];
                  
                  return (
                    <div key={`kr-${kr.id}-${isDepartmentObjective ? 'dept' : 'regular'}`} className={`${bgColor} border ${borderColor} rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {isDepartmentObjective && relatedIndividualObjectives.length > 0 && (
                            <span 
                              className="cursor-pointer text-gray-600 hover:text-gray-800"
                              onClick={e => {
                                e.stopPropagation();
                                toggleIndividualObjectives(kr.id);
                              }}
                            >
                              {expandedIndividualObjectives.has(kr.id) ? '>' : '>'}
                            </span>
                          )}
                          <Building className={`h-4 w-4 ${iconColor}`} />
                          <span className={`text-sm font-medium ${textColor}`}>{kr.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {kr.metric_type === 'number' ? 
                              `${kr.current_value || 0}/${kr.target_value}` : 
                              `${actualKRProgress}%`
                            }
                          </Badge>
                          <ObjectiveCheckinForm
                            objectiveId={kr.id}
                            objectiveTitle={kr.title}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                Check-in
                              </Button>
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`${labelColor} font-medium`}>Progress</span>
                          {kr.metric_type === 'number' ? (
                            <span className={`${textColor} font-medium`}>
                              {kr.current_value || 0} / {kr.target_value} {kr.unit || ''}
                            </span>
                          ) : (
                            <span className={`${textColor} font-medium`}>
                              {actualKRProgress}%
                            </span>
                          )}
                        </div>
                        {kr.metric_type === 'number' ? (
                          <Progress 
                            value={((kr.current_value || 0) / kr.target_value) * 100} 
                            className="h-2" 
                          />
                        ) : (
                          <Progress value={actualKRProgress} className="h-2" />
                        )}
                      </div>
                      
                      {kr.department_name && (
                        <p className={`text-xs ${labelColor} mt-2`}>
                          {kr.department_name}
                        </p>
                      )}
                      
                      {kr.why_important && (
                        <div className={`${isDepartmentObjective ? 'bg-green-100' : 'bg-blue-100'} p-2 rounded-md mt-2`}>
                          <h6 className={`font-medium text-xs ${isDepartmentObjective ? 'text-green-900' : 'text-blue-900'} mb-1 uppercase tracking-wide`}>
                            Why this is important:
                          </h6>
                          <p className={`text-xs ${isDepartmentObjective ? 'text-green-800' : 'text-blue-800'}`}>
                            {kr.why_important}
                          </p>
                        </div>
                      )}
                      
                      {/* Approval Buttons only for actual Key Results, not Department Objectives */}
                      {!isDepartmentObjective && (
                        <KeyResultApprovalButtons
                          keyResultId={kr.id}
                          isDepartmentLevel={false}
                        />
                      )}
                      
                      {/* Individual Objectives linked to this Department Objective */}
                      {isDepartmentObjective && expandedIndividualObjectives.has(kr.id) && relatedIndividualObjectives.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <h6 className="text-xs font-medium text-green-800 mb-2 uppercase tracking-wide">Individual Objectives:</h6>
                          <div className="space-y-2">
                            {relatedIndividualObjectives.map((indObj: any) => (
                              <div key={indObj.id} className="bg-white border border-green-300 rounded-md p-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-green-900">{indObj.title}</span>
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                    {indObj.progress_percentage || 0}%
                                  </Badge>
                                </div>
                                <Progress value={indObj.progress_percentage || 0} className="h-1 mt-1" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {(!objective.all_key_results || objective.all_key_results.length === 0) && (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No key results yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCreateKR(objective)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Key Result
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };
  return <div className="h-full flex flex-col max-h-[calc(100vh-450px)] overflow-hidden">

      {/* Status Groups */}
      <div className="h-[50vh] space-y-2 seamless-scroll overflow-y-auto scrollbar-hide min-h-0 mt-1">
        {/* Active Objectives */}
        <SectionActiveObjectives
          activeObjectives={activeObjectives}
          expandedObjective={expandedObjective}
          setExpandedObjective={setExpandedObjective}
          renderObjectiveCard={renderObjectiveCard}
        />

        {/* Draft Objectives */}
        <SectionDraftObjectives
          draftObjectives={draftObjectives}
          expandedObjective={expandedObjective}
          setExpandedObjective={setExpandedObjective}
          renderObjectiveCard={renderObjectiveCard}
        />

        {/* Completed Objectives */}
        <SectionCompletedObjectives
          completedObjectives={completedObjectives}
          expandedObjective={expandedObjective}
          setExpandedObjective={setExpandedObjective}
          renderObjectiveCard={renderObjectiveCard}
        />
      </div>

      {/* TODO: Update to use ModalAddCompanyContribution */}
      {/* <ModalCreateObjective open={showCreateDialog} onOpenChange={setShowCreateDialog} organizationId={organizationId} entityId={organizationId} entityName="Company" cycleId={cycleId} /> */}

      {createKRDialog.open && createKRDialog.objective && <CreateKeyResultDialog open={createKRDialog.open} onOpenChange={open => setCreateKRDialog({
      open
    })} objective={createKRDialog.objective} />}
    </div>;
};