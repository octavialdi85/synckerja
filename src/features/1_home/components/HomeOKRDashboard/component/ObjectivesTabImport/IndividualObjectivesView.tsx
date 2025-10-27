import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Building, Plus, Target, ChevronRight, ChevronDown, User, MoreHorizontal, CheckCircle, Calendar, Trash2, Edit } from 'lucide-react';
import { Progress } from '@/features/ui/progress';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { useIndividualObjectives, useDeleteIndividualObjective } from '../../modal/useIndividualObjectives';
import { useDepartmentObjectives } from '../../modal/useDepartmentObjectives';
import { useDepartments } from './CompanyObjectivesDetailViewImport/useDepartments';
import { CreateIndividualObjectiveModal } from './DepartmentObjectivesViewImport/CreateIndividualObjectiveModal';
import { ModalAddIndividualContribution } from '../../modal/ModalAddIndividualContribution';
import { ObjectiveCheckinForm } from './CompanyObjectivesDetailViewImport/ObjectiveCheckinForm';
import { CreateActivityModal } from './DepartmentObjectivesViewImport/CreateActivityModal';
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
  // Create Activity Modal states
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [selectedObjectiveForActivity, setSelectedObjectiveForActivity] = useState<{
    id: string;
    title: string;
    employeeId: string;
  } | null>(null);

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

  // Get individual objectives from the dedicated table
  const finalCycleIds = cycleIds && cycleIds.length > 0 ? cycleIds : cycleId ? [cycleId] : undefined;
  const {
    data: individualObjectives = [],
    isLoading: loadingObjectives
  } = useIndividualObjectives(organizationId, finalCycleIds);

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
  const getSyncedProgress = (objective: any) => {
    // Calculate progress based on objective's own progress_percentage
    return objective.progress_percentage || 0;
  };
  if (loadingEmployees || loadingObjectives || loadingDepartments) {
    return <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading objectives...</p>
        </div>
      </div>;
  }

  // Get objectives grouped by department and employee
  const getObjectivesByDepartmentAndEmployee = () => {
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
  };

  // Get employees by department
  const getEmployeesByDepartment = () => {
    const grouped = new Map<string, any[]>();
    employees.forEach(emp => {
      const deptId = emp.department_id || 'no-department';
      if (!grouped.has(deptId)) {
        grouped.set(deptId, []);
      }
      grouped.get(deptId)!.push(emp);
    });
    return grouped;
  };
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.full_name || 'Unknown Employee';
  };
  const renderObjectiveCard = (objective: any, departmentId: string, borderColor: string, iconColor: string) => {
    const syncedProgress = getSyncedProgress(objective);
    
    return (
      <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-4 last:mb-0 w-full`}>
        <AccordionTrigger className="py-4 px-6 hover:bg-gray-50 transition-colors [&[data-state=open]>div>div:first-child>svg]:rotate-180">
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3 flex-1">
                {/* Dropdown for activities */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                      <Plus className="h-4 w-4" />
                    </Button>
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
                <Button size="sm" variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200" onClick={(e) => e.stopPropagation()}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
                <Badge variant="outline" className={`text-xs ${objective.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : objective.status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {objective.status === 'active' ? 'Active' : objective.status === 'draft' ? 'Draft' : 'Completed'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteObjective(e, { id: objective.id, title: objective.title })}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <div className="text-sm text-gray-500 min-w-[3rem] text-right">
                  {Math.round(syncedProgress)}%
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">{Math.round(syncedProgress)}%</span>
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
  const objectivesByDepartmentAndEmployee = getObjectivesByDepartmentAndEmployee();
  const employeesByDepartment = getEmployeesByDepartment();
  // Group objectives by employee and status (similar to Department view)
  const getObjectivesByEmployeeAndStatus = () => {
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
  };

  const renderEmployeeObjectiveCard = (objective: any, employeeId: string, status: string, borderColor: string, iconColor: string) => {
    const syncedProgress = getSyncedProgress(objective);
    return (
      <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-2 last:mb-0`}>
        <AccordionTrigger className="py-0 px-0 hover:bg-gray-50 transition-colors [&>svg]:hidden">
          <div className="w-full">
            {/* Header Section */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-2 flex-1">
                <Target className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm font-medium text-gray-900 truncate text-left">
                  {objective.title}
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <ObjectiveCheckinForm
                  objectiveId={objective.id}
                  objectiveTitle={objective.title}
                  trigger={
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Weekly Check-in
                    </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEditObjective(e, objective)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                  title="Edit objective"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteObjective(e, { id: objective.id, title: objective.title })}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Average Progress</span>
                <span className="font-medium">{Math.round(syncedProgress)}%</span>
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

  const objectivesByEmployeeAndStatus = getObjectivesByEmployeeAndStatus();

  return <div className="h-full w-full flex flex-col">
      <div className="flex-1 w-full overflow-auto">
        <div className="space-y-4 pr-4 h-full">
          {/* Employee List with Expand/Collapse */}
          <div className="space-y-2">
            {employees.map(employee => {
              const employeeObjectivesMap = objectivesByEmployeeAndStatus.get(employee.id) || new Map();
              const activeObjectives = employeeObjectivesMap.get('active') || [];
              const draftObjectives = employeeObjectivesMap.get('draft') || [];
              const completedObjectives = employeeObjectivesMap.get('completed') || [];
              const totalObjectives = activeObjectives.length + draftObjectives.length + completedObjectives.length;
              
              return (
                <div key={employee.id} className="border border-gray-200 rounded-lg">
                  <Collapsible open={expandedEmployees.has(employee.id)} onOpenChange={() => toggleEmployee(employee.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
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
                          <div className="flex items-center space-x-2">
                            {/* Three Dots Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
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
    }} organizationId={organizationId} cycleId={cycleId || ''} employeeId={selectedEmployee} employeeName={employees.find(emp => emp.id === selectedEmployee)?.full_name || 'Unknown Employee'} onSuccess={() => {
      console.log('✅ Individual objective created successfully');
    }} />}

      {/* Add Individual Contribution Modal */}
      <ModalAddIndividualContribution open={showContributionModal} onOpenChange={setShowContributionModal} organizationId={organizationId} cycleId={cycleId || finalCycleIds?.[0] || ''} onSuccess={() => {
      console.log('✅ Individual contribution created successfully');
    }} />

      {/* Create Activity Modal */}
      {selectedObjectiveForActivity && (
        <CreateActivityModal
          isOpen={showCreateActivityModal}
          onClose={() => {
            setShowCreateActivityModal(false);
            setSelectedObjectiveForActivity(null);
          }}
          organizationId={organizationId}
          objectiveId={selectedObjectiveForActivity.id}
          objectiveTitle={selectedObjectiveForActivity.title}
          employeeId={selectedObjectiveForActivity.employeeId}
        />
      )}

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
