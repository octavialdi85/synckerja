import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Building, Plus, Target, ChevronRight, ChevronDown, User, MoreHorizontal, CheckCircle, Calendar, Trash2, Edit } from 'lucide-react';
import { LoadingDots } from '@/components/LoadingDots';
import { Progress } from '@/features/ui/progress';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { getEmployeeStatus } from '@/features/2-1-employees/utils/employeeUtils';
import { useIndividualObjectives, useDeleteIndividualObjective } from '../../modal/useIndividualObjectives';
import { useObjectives } from './useObjectives';
import { useDepartmentObjectives } from '../../modal/useDepartmentObjectives';
import { useDepartments } from './CompanyObjectivesDetailViewImport/useDepartments';
import { CreateIndividualObjectiveModal } from './DepartmentObjectivesViewImport/CreateIndividualObjectiveModal';
import { ModalAddIndividualContribution } from '../../modal/ModalAddIndividualContribution';
import { ObjectiveCheckinForm } from './CompanyObjectivesDetailViewImport/ObjectiveCheckinForm';
import { DeleteIndividualObjectiveDialog } from './DeleteIndividualObjectiveDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/features/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
interface IndividualObjectivesViewProps {
  organizationId: string;
  cycleId?: string;
  cycleIds?: string[];
}
export const IndividualObjectivesView = ({
  organizationId,
  cycleId,
  cycleIds
}: IndividualObjectivesViewProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedObjective, setExpandedObjective] = useState<string>('');
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  // Delete Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedObjectiveForDelete, setSelectedObjectiveForDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Edit Modal states
  const [editModal, setEditModal] = useState<{
    open: boolean;
    objective?: any;
  }>({
    open: false
  });

  const {
    data: employees = [],
    isLoading: loadingEmployees
  } = useEmployees();
  const queryClient = useQueryClient();

  // Filter out terminated employees
  const activeEmployees = useMemo(() => {
    return employees.filter(employee => {
      const status = getEmployeeStatus(employee);
      return status.toLowerCase() !== 'terminated';
    });
  }, [employees]);

  // Get individual objectives with key results from useObjectives hook
  const finalCycleIds = cycleIds && cycleIds.length > 0 ? cycleIds : cycleId ? [cycleId] : undefined;
  const finalCycleId = cycleIds && cycleIds.length > 0 ? cycleIds[0] : cycleId; // Use first cycle ID for useObjectives
  
  // console.log('🔍 IndividualObjectivesView - Before useObjectives:', {
  //   organizationId,
  //   finalCycleId,
  //   level: 'individual'
  // });
  
  const {
    data: individualObjectives = [],
    isLoading: loadingObjectives
  } = useObjectives(organizationId, finalCycleId, 'individual');
  
  // Memoize debug logging to prevent excessive console output
  const debugInfo = useMemo(() => ({
    organizationId,
    cycleId,
    cycleIds,
    finalCycleId,
    finalCycleIds,
    individualObjectivesCount: individualObjectives.length,
    loadingObjectives,
    individualObjectives: individualObjectives.map(obj => ({
      id: obj.id,
      title: obj.title,
      employee_id: obj.employee_id,
      cycle_id: obj.cycle_id,
      hasKeyResults: obj.key_results && obj.key_results.length > 0,
      keyResultsCount: obj.key_results ? obj.key_results.length : 0
    }))
  }), [organizationId, cycleId, cycleIds, finalCycleId, finalCycleIds, individualObjectives, loadingObjectives]);

  // Only log when debug info changes significantly
  useEffect(() => {
    // console.log('🔍 IndividualObjectivesView - After useObjectives:', debugInfo);
  }, [debugInfo]);

  // Get department objectives for showing as key results in Department tab
  const {
    data: departmentObjectives = []
  } = useDepartmentObjectives(organizationId, finalCycleIds);

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!organizationId) return;
    const channels = [
    // Subscribe to individual objectives changes
    supabase.channel('individual-objectives-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'individual_objectives',
      filter: `organization_id=eq.${organizationId}`
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['individual-objectives']
      });
    }).subscribe()];
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [organizationId, queryClient]);
  const {
    departments = [],
    isLoading: loadingDepartments
  } = useDepartments(organizationId);
  const deleteObjective = useDeleteIndividualObjective();
  const handleCreateObjective = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setIsCreateModalOpen(true);
  };
  const handleAddContribution = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setShowContributionModal(true);
  };
  
  const handleCreateActivity = (objectiveId: string, objectiveTitle: string, employeeId: string) => {
    setSelectedObjectiveForActivity({
      id: objectiveId,
      title: objectiveTitle,
      employeeId: employeeId
    });
    setShowCreateActivityModal(true);
  };
  
  const handleDeleteObjective = (e: React.MouseEvent, objective: { id: string; title: string }) => {
    e.stopPropagation(); // Prevent accordion toggle
    setSelectedObjectiveForDelete(objective);
    setShowDeleteDialog(true);
  };

  const handleEditObjective = (e: React.MouseEvent, objective: any) => {
    e.stopPropagation(); // Prevent accordion toggle
    setEditModal({
      open: true,
      objective
    });
  };
  
  const toggleEmployee = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };
  const getEmployeeIndividualObjectives = (employeeId: string) => {
    // Filter individual objectives that belong to this employee
    return individualObjectives.filter(obj => (obj as any).employee_id === employeeId);
  };
  const getSyncedProgress = useCallback((objective: any) => {
    // console.log('🔍 Individual Objective Progress Debug:', {
    //   objectiveId: objective.id,
    //   objectiveTitle: objective.title,
    //   hasKeyResults: objective.key_results && objective.key_results.length > 0,
    //   keyResults: objective.key_results,
    //   objectiveProgressPercentage: objective.progress_percentage
    // });
    
    // For individual objectives that have their own key results, 
    // we need to calculate progress from key_results data
    if (objective.key_results && objective.key_results.length > 0) {
      const keyResult = objective.key_results[0]; // Get first key result
      
      if (keyResult.metric_type === 'number') {
        // For numerical metrics, calculate percentage: (current_value / target_value) * 100
        const currentValue = keyResult.current_value || 0;
        const targetValue = keyResult.target_value || 1;
        const calculatedProgress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
        
        // console.log('📊 Numerical Metric Progress:', {
        //   currentValue,
        //   targetValue,
        //   calculatedProgress
        // });
        
        return calculatedProgress;
      } else {
        // For percentage metrics, use progress_percentage from key_results
        const progressPercentage = keyResult.progress_percentage || 0;
        
        // console.log('📊 Percentage Metric Progress:', {
        //   progressPercentage
        // });
        
        return progressPercentage;
      }
    }
    
    // Fallback to objective's own progress_percentage for objectives without key results
    const fallbackProgress = objective.progress_percentage || 0;
    
    // console.log('📊 Fallback Progress:', {
    //   fallbackProgress
    // });
    
    return fallbackProgress;
  }, []);

  // Memoize expensive calculations - MUST be before any early returns
  const objectivesByDepartmentAndEmployee = useMemo(() => {
    const grouped = new Map<string, Map<string, any[]>>();

    // Group by department first, then by employee
    individualObjectives.forEach(obj => {
      const deptId = (obj as any).department_id || 'no-department';
      const employeeId = (obj as any).employee_id;
      if (!grouped.has(deptId)) {
        grouped.set(deptId, new Map());
      }
      const deptGroup = grouped.get(deptId)!;
      if (!deptGroup.has(employeeId)) {
        deptGroup.set(employeeId, []);
      }
      deptGroup.get(employeeId)!.push(obj);
    });
    return grouped;
  }, [individualObjectives]);

  const employeesByDepartment = useMemo(() => {
    const grouped = new Map<string, any[]>();
    employees.forEach(emp => {
      const deptId = emp.department_id || 'no-department';
      if (!grouped.has(deptId)) {
        grouped.set(deptId, []);
      }
      grouped.get(deptId)!.push(emp);
    });
    return grouped;
  }, [employees]);

  // Memoize objectives by employee and status
  const objectivesByEmployeeAndStatus = useMemo(() => {
    const employeeObjectivesMap = new Map<string, Map<string, any[]>>();
    
    individualObjectives.forEach(objective => {
      if (!employeeObjectivesMap.has((objective as any).employee_id)) {
        employeeObjectivesMap.set((objective as any).employee_id, new Map());
      }
      
      const statusMap = employeeObjectivesMap.get((objective as any).employee_id)!;
      if (!statusMap.has((objective as any).status)) {
        statusMap.set((objective as any).status, []);
      }
      
      statusMap.get((objective as any).status)!.push(objective);
    });
    
    return employeeObjectivesMap;
  }, [individualObjectives]);

  if (loadingEmployees || loadingObjectives || loadingDepartments) {
    return <div className="flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-2">
          <LoadingDots size="md" />
          <p className="text-sm text-gray-600">Loading objectives...</p>
        </div>
      </div>;
  }
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };
  const getEmployeeName = (employeeId: string) => {
    const employee = activeEmployees.find(emp => emp.id === employeeId);
    return employee?.full_name || 'Unknown Employee';
  };
  const renderObjectiveCard = (objective: any, departmentId: string, borderColor: string, iconColor: string) => {
    const syncedProgress = getSyncedProgress(objective);
    
    return (
      <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-4 last:mb-0 w-full`}>
        <AccordionTrigger className="py-4 px-6 hover:bg-gray-50 transition-colors [&[data-state=open]>div>div:first-child>svg]:rotate-180">
          <div className="space-y-4 w-full">
            {/* Title Row */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3 flex-1">
                {/* Dropdown for activities */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="h-8 w-8 p-0 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <Plus className="h-4 w-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-white shadow-lg border z-50">
                    <DropdownMenuItem className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Activity
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Add Milestone
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Target className={`h-4 w-4 ${iconColor}`} />
                <span className="text-base font-semibold text-gray-900 flex-1 text-left">
                  {objective.title}
                </span>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0 mr-3">
                <Badge variant="outline" className={`text-xs ${objective.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : objective.status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {objective.status === 'active' ? 'Active' : objective.status === 'draft' ? 'Draft' : 'Completed'}
                </Badge>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteObjective(e, { id: objective.id, title: objective.title });
                  }}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer rounded transition-colors"
                  title="Delete objective"
                >
                  <Trash2 className="h-3 w-3" />
                </div>
              </div>
            </div>
            
            {/* Progress Bar with Check In Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-sm cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Check In</span>
                  </div>
                  <span className="font-medium">{Math.round(syncedProgress)}%</span>
                </div>
              </div>
              <Progress value={syncedProgress} className="h-3" />
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-6 pb-6 space-y-4">
          {objective.description && (
            <div>
              <p className="text-sm text-gray-600">
                {objective.description}
              </p>
            </div>
          )}
          
          {/* Why this is important section */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Why this is important</h4>
            <p className="text-sm text-yellow-700">
              Achieving this objective will significantly contribute to the department's overall performance metrics and align with our strategic business goals for this quarter.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const renderEmployeeObjectiveCard = (objective: any, employeeId: string, status: string, borderColor: string, iconColor: string) => {
    const syncedProgress = getSyncedProgress(objective);
    return (
      <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-2 last:mb-0`}>
        <AccordionTrigger className="py-0 px-0 hover:bg-gray-50 transition-colors [&>svg]:hidden">
          <div className="w-full">
            {/* Header Section */}
            <div className="px-4 py-3">
              {/* Title Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <Target className={`h-4 w-4 ${iconColor}`} />
                  <span className="text-sm font-medium text-gray-900 truncate text-left">
                    {objective.title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div
                    onClick={(e) => handleEditObjective(e, objective)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center cursor-pointer rounded"
                    title="Edit objective"
                  >
                    <Edit className="h-3 w-3" />
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteObjective(e, { id: objective.id, title: objective.title });
                    }}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer rounded transition-colors"
                    title="Delete objective"
                  >
                    <Trash2 className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Weekly Check-in Button with Progress Info */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                  <ObjectiveCheckinForm
                    objectiveId={objective.id}
                    objectiveTitle={objective.title}
                    trigger={
                      <div className="h-7 px-2 text-xs border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 text-blue-600 rounded flex items-center space-x-1 cursor-pointer">
                        <Calendar className="h-3 w-3" />
                        <span>Weekly Check-in</span>
                      </div>
                    }
                  />
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    0 KRs
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${
                    status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                    status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Completed'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500">Average Progress</span>
                  <span className="font-medium">{Math.round(syncedProgress)}%</span>
                </div>
              </div>
              <Progress value={syncedProgress} className="h-2" />
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-4 pb-4">
          {/* Why this is important section */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 text-sm uppercase tracking-wide">
              WHY THIS IS IMPORTANT:
            </h4>
            <p className="text-sm text-blue-700">
              {objective.why_important || 'Supporting company objective by contributing to key metrics and departmental goals for this quarter.'}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };


  return <div className="h-full w-full flex flex-col">
      <div className="flex-1 w-full overflow-auto">
        <div className="space-y-4 h-full">
          {/* Employee List with Expand/Collapse */}
          <div className="space-y-2">
            {activeEmployees.map(employee => {
              const employeeObjectivesMap = objectivesByEmployeeAndStatus.get(employee.id) || new Map();
              const activeObjectives = employeeObjectivesMap.get('active') || [];
              const draftObjectives = employeeObjectivesMap.get('draft') || [];
              const completedObjectives = employeeObjectivesMap.get('completed') || [];
              const totalObjectives = activeObjectives.length + draftObjectives.length + completedObjectives.length;
              
              return (
                <div key={employee.id} className="border border-gray-200 rounded-lg w-full">
                  <Collapsible open={expandedEmployees.has(employee.id)} onOpenChange={() => toggleEmployee(employee.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors w-full">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3 flex-1">
                            {expandedEmployees.has(employee.id) ? 
                              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            }
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600">
                                {employee.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{employee.full_name || 'Unknown Employee'}</span>
                              <p className="text-sm text-gray-500">{employee.job_position_name || 'No Position'}</p>
                            </div>
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {totalObjectives} Objectives
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {/* Three Dots Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <div className="h-8 w-8 p-0 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer" onClick={e => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={e => {
                                  e.stopPropagation();
                                  handleCreateObjective(employee.id);
                                }} className="flex items-center">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create Objective
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={e => {
                                  e.stopPropagation();
                                  handleAddContribution(employee.department_id);
                                }} className="flex items-center">
                                  <Target className="h-4 w-4 mr-2" />
                                  Add Contribution
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="p-4">
                        {totalObjectives === 0 ? (
                          <div className="text-center py-8">
                            <Target className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                            <h4 className="font-medium text-gray-900 mb-2">No objectives for {employee.full_name}</h4>
                            <p className="text-sm text-gray-500 mb-4">
                              Create objectives to track personal goals and contributions.
                            </p>
                            <div className="flex justify-center space-x-2">
                              <Button size="sm" onClick={() => handleCreateObjective(employee.id)} className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-3 w-3 mr-1" />
                                Create Objective
                              </Button>
                              <Button size="sm" onClick={() => handleAddContribution(employee.department_id)} className="bg-orange-600 hover:bg-orange-700">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Contribution
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Active Objectives */}
                            {activeObjectives.length > 0 && (
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Target className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-gray-900">Active</span>
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    {activeObjectives.length}
                                  </Badge>
                                </div>
                                <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                                  {activeObjectives.map(objective => 
                                    renderEmployeeObjectiveCard(objective, employee.id, 'active', 'border-l-green-500', 'text-green-600')
                                  )}
                                </Accordion>
                              </div>
                            )}

                            {/* Draft Objectives */}
                            {draftObjectives.length > 0 && (
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Calendar className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-gray-900">Draft</span>
                                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                    {draftObjectives.length}
                                  </Badge>
                                </div>
                                <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                                  {draftObjectives.map(objective => 
                                    renderEmployeeObjectiveCard(objective, employee.id, 'draft', 'border-l-yellow-500', 'text-yellow-600')
                                  )}
                                </Accordion>
                              </div>
                            )}

                            {/* Completed Objectives */}
                            {completedObjectives.length > 0 && (
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-900">Completed</span>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {completedObjectives.length}
                                  </Badge>
                                </div>
                                <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                                  {completedObjectives.map(objective => 
                                    renderEmployeeObjectiveCard(objective, employee.id, 'completed', 'border-l-blue-500', 'text-blue-600')
                                  )}
                                </Accordion>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Individual Objective Modal */}
      {selectedEmployee && <CreateIndividualObjectiveModal open={isCreateModalOpen} onOpenChange={open => {
      setIsCreateModalOpen(open);
      if (!open) {
        setSelectedEmployee(null);
      }
    }} organizationId={organizationId} cycleId={cycleId || ''} employeeId={selectedEmployee} employeeName={activeEmployees.find(emp => emp.id === selectedEmployee)?.full_name || 'Unknown Employee'} onSuccess={() => {
      console.log('✅ Individual objective created successfully');
    }} />}

      {/* Add Individual Contribution Modal */}
      <ModalAddIndividualContribution open={showContributionModal} onOpenChange={setShowContributionModal} organizationId={organizationId} cycleId={cycleId || finalCycleIds?.[0] || ''} onSuccess={() => {
      console.log('✅ Individual contribution created successfully');
    }} />

      {/* Delete Individual Objective Dialog */}
      <DeleteIndividualObjectiveDialog
        objective={selectedObjectiveForDelete}
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedObjectiveForDelete(null);
        }}
      />

      {/* Edit Individual Objective Modal */}
      {editModal.open && editModal.objective && (
        <ModalAddIndividualContribution
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open })}
          organizationId={organizationId}
          cycleId={cycleId || finalCycleIds?.[0] || ''}
          editObjective={editModal.objective}
          onSuccess={() => {
            console.log('✅ Individual objective updated successfully');
            setEditModal({ open: false });
          }}
        />
      )}
    </div>;
};
