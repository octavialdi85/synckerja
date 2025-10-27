import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Progress } from '@/features/ui/progress';
import { ScrollArea } from '@/features/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Building, Plus, Target, ChevronRight, ChevronDown, CheckCircle, Users, TrendingUp, Calendar, User, MoreHorizontal, History, Edit } from 'lucide-react';
import { useObjectives } from './useObjectives';
import { useFilteredObjectives } from './useFilteredObjectives';
import { useDepartments } from './CompanyObjectivesDetailViewImport/useDepartments';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { CreateIndividualObjectiveModal } from './DepartmentObjectivesViewImport/CreateIndividualObjectiveModal';
import { CreateActivityModal } from './DepartmentObjectivesViewImport/CreateActivityModal';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/features/ui/collapsible';
import { WeeklyCheckinForm } from './DepartmentObjectivesViewImport/WeeklyCheckinDialog';
import { ObjectiveCheckinForm } from './CompanyObjectivesDetailViewImport/ObjectiveCheckinForm';
// TODO: Already using ModalAddDepartmentContribution, can remove this
// import { ModalCreateObjective } from '@/components/1_home/components/ModalCreateObjective';
import { CreateKeyResultDialog } from './CompanyObjectivesDetailViewImport/CreateKeyResultDialog';
import { ModalAddDepartmentContribution } from '../../modal/ModalAddDepartmentContribution';

import { WeeklyCheckinHistoryDialog } from './DepartmentObjectivesViewImport/WeeklyCheckinHistoryDialog';
import { DepartmentObjectivesEmptyState } from './DepartmentObjectivesViewImport/DepartmentObjectivesEmptyState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartmentObjectivesList, useDeleteDepartmentObjective } from './DepartmentObjectivesViewImport/useDepartmentObjectivesList';
import { useIndividualObjectives } from '../../modal/useIndividualObjectives';
import { useDepartmentAsKeyResult } from './DepartmentObjectivesViewImport/useDepartmentAsKeyResult';
import { useAttendanceOperations } from './DepartmentObjectivesViewImport/useAttendanceOperations';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
interface DepartmentObjectivesViewProps {
  organizationId: string;
  cycleId?: string;
  cycleIds?: string[]; // Support for multiple cycle IDs
}
export const DepartmentObjectivesView = ({
  organizationId,
  cycleId,
  cycleIds
}: DepartmentObjectivesViewProps) => {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedObjective, setExpandedObjective] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [createKRDialog, setCreateKRDialog] = useState<{
    open: boolean;
    objective?: any;
  }>({
    open: false
  });
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    keyResultId?: string;
    objectiveId?: string;
    objectiveTitle?: string;
    cycleId?: string;
  }>({
    open: false
  });

  // Edit Modal states
  const [editModal, setEditModal] = useState<{
    open: boolean;
    objective?: any;
  }>({
    open: false
  });
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Individual objectives modal states
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  // Create Activity Modal states
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [selectedObjectiveForActivity, setSelectedObjectiveForActivity] = useState<{
    id: string;
    title: string;
    employeeId: string;
  } | null>(null);

  // Get department objectives from the dedicated table
  const finalCycleIds = cycleIds && cycleIds.length > 0 ? cycleIds : cycleId ? [cycleId] : undefined;
  const {
    data: departmentObjectives = [],
    isLoading: loadingObjectives
  } = useDepartmentObjectivesList(organizationId, finalCycleIds);
  const {
    departments = [],
    isLoading: loadingDepartments
  } = useDepartments(organizationId);
  const {
    data: employees = []
  } = useEmployees();

  // Get individual objectives for showing in department objectives
  const {
    data: individualObjectives = []
  } = useIndividualObjectives(organizationId, finalCycleIds);
  const {
    user: currentUser
  } = useCurrentUser();

  // Attendance operations hook
  const {
    checkIn,
    loading: attendanceLoading
  } = useAttendanceOperations();
  const deleteObjective = useDeleteDepartmentObjective();

  // Filter department objectives by department for each department
  const loadingAllObjectives = loadingObjectives;

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId || emp.user_id === employeeId);
    return employee?.full_name || 'Unknown Employee';
  };

  // Helper function to get individual objectives for a department objective
  const getIndividualObjectivesForDepartment = (departmentObjectiveId: string) => {
    return individualObjectives.filter(indObj => indObj.department_objective_id === departmentObjectiveId);
  };

  // Helper function to get synced progress for department objective
  const getSyncedProgress = (objective: any) => {
    // If objective has its own key results
    if (objective.key_results && objective.key_results.length > 0) {
      const totalProgress = objective.key_results.reduce((sum: number, kr: any) => {
        const startValue = kr.start_value || 0;
        const currentValue = kr.current_value || 0;
        const targetValue = kr.target_value;
        if (!targetValue || targetValue === 0) return sum;
        const totalRange = targetValue - startValue;
        const achievedRange = currentValue - startValue;
        if (totalRange <= 0) return sum;
        const progress = kr.is_inverse ? Math.max(0, Math.min(100, (startValue - currentValue) / (startValue - targetValue) * 100)) : Math.max(0, Math.min(100, achievedRange / totalRange * 100));
        return sum + progress;
      }, 0);
      return Math.round(totalProgress / objective.key_results.length);
    }
    return objective.progress_percentage || 0;
  };
  const toggleDepartment = (departmentId: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (expandedDepartments.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);
    }
    setExpandedDepartments(newExpanded);
  };
  // Remove this function - accordion behavior will be handled by Accordion component
  const getObjectivesByDepartmentAndStatus = () => {
    const grouped = new Map<string, Map<string, any[]>>();
    departmentObjectives.forEach(obj => {
      const deptId = obj.department_id || 'no-department';
      const status = obj.status;
      if (!grouped.has(deptId)) {
        grouped.set(deptId, new Map());
      }
      const deptGroup = grouped.get(deptId)!;
      if (!deptGroup.has(status)) {
        deptGroup.set(status, []);
      }
      deptGroup.get(status)!.push(obj);
    });
    return grouped;
  };
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };
  const handleCreateKR = (objective: any) => {
    setCreateKRDialog({
      open: true,
      objective
    });
  };
  const handleCreateObjective = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setShowCreateDialog(true);
  };
  const handleAddContribution = (departmentId: string) => {
    console.log('🎯 Add Contribution clicked for department:', departmentId);
    console.log('🎯 Setting selectedDepartmentId:', departmentId);
    console.log('🎯 Opening contribution modal');
    setSelectedDepartmentId(departmentId);
    setShowContributionModal(true);
  };

  // Individual objectives functions
  const handleCreateIndividualObjective = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setIsCreateModalOpen(true);
  };
  const handleCreateActivity = (objectiveId: string, objectiveTitle: string, employeeId: string) => {
    setSelectedObjectiveForActivity({
      id: objectiveId,
      title: objectiveTitle,
      employeeId: employeeId
    });
    setShowCreateActivityModal(true);
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
    return individualObjectives.filter(obj => obj.employee_id === employeeId);
  };
  const handleDeleteObjective = (e: React.MouseEvent, objectiveId: string) => {
    e.stopPropagation(); // Prevent accordion toggle
    if (confirm('Are you sure you want to delete this objective?')) {
      deleteObjective.mutate(objectiveId);
    }
  };

  const handleEditObjective = (e: React.MouseEvent, objective: any) => {
    e.stopPropagation(); // Prevent accordion toggle
    setEditModal({
      open: true,
      objective
    });
  };

  // Handle attendance check-in
  const handleAttendanceCheckIn = async (objectiveTitle: string) => {
    try {
      // Get user's current location
      if (!navigator.geolocation) {
        toast.error('Geolocation tidak didukung oleh browser ini');
        return;
      }
      toast.info('Mendapatkan lokasi...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      const {
        latitude,
        longitude
      } = position.coords;

      // Perform check-in using existing attendance system
      const success = await checkIn({
        latitude,
        longitude,
        photoUrl: undefined // Could be enhanced to capture photo
      });
      if (success) {
        toast.success(`Check-in berhasil untuk objective: ${objectiveTitle}`);
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Akses lokasi ditolak. Mohon izinkan akses lokasi untuk check-in.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Informasi lokasi tidak tersedia.');
            break;
          case error.TIMEOUT:
            toast.error('Timeout mendapatkan lokasi.');
            break;
          default:
            toast.error('Error mendapatkan lokasi.');
            break;
        }
      } else {
        toast.error('Gagal melakukan check-in');
      }
    }
  };
  if (loadingObjectives || loadingDepartments || loadingAllObjectives) {
    return <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading objectives...</p>
        </div>
      </div>;
  }
  const objectivesByDepartmentAndStatus = getObjectivesByDepartmentAndStatus();
  const renderObjectiveCard = (objective: any, departmentId: string, status: string, borderColor: string, iconColor: string) => {
    const syncedProgress = getSyncedProgress(objective);
    return <AccordionItem key={objective.id} value={objective.id} className={`border-l-4 ${borderColor} shadow-sm mb-2 last:mb-0`}>
        <AccordionTrigger className="py-0 px-0 hover:bg-gray-50 transition-colors [&>svg]:hidden">
          <div className="w-full">
            {/* Header Section */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-2 flex-1">
                <Building className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm font-medium text-gray-900 truncate text-left">
                  {objective.title}
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <ObjectiveCheckinForm objectiveId={objective.id} objectiveTitle={objective.title} trigger={<Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Weekly Check-in
                    </Button>} onSuccess={() => {
                console.log('✅ Weekly OKR check-in saved successfully');
              }} />
                <Badge variant="outline" className="text-xs">
                  {objective.key_results?.length || 0} KRs
                </Badge>
                <Badge variant="outline" className={`text-xs ${status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Completed'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEditObjective(e, objective)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                  title="Edit objective"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={e => handleDeleteObjective(e, objective.id)} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </Button>
                {/* Custom Expand/Collapse Arrow */}
                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180" />
              </div>
            </div>

            {/* Average Progress Label */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm text-blue-600 font-medium">Average Progress</span>
              <span className="text-sm font-medium text-blue-600">{Math.round(syncedProgress || 0)}%</span>
            </div>
            
            {/* Progress Bar - Full Width with padding */}
            <div className="px-4 w-full">
              <Progress value={syncedProgress || 0} className="h-2 w-full" />
            </div>

            {/* Why Important Section */}
            {objective.why_important && <div className="bg-blue-50 p-3 mx-4 rounded-lg mt-3 mb-3">
                <h5 className="font-medium text-xs text-blue-900 mb-1 uppercase tracking-wide">
                  Why this is important:
                </h5>
                <p className="text-xs text-blue-800">
                  Supporting Company Objective : {objective.company_objectives?.title || "Company Objective"}
                </p>
              </div>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {/* Progress Bar Overview for Key Results */}
          {objective.key_results && objective.key_results.length > 0 && <div className="mb-4 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Progress Overview
                </h5>
                <span className="text-xs font-medium text-gray-600">
                  {Math.round(objective.key_results.reduce((acc: number, kr: any) => acc + (kr.progress_percentage || 0), 0) / objective.key_results.length)}% Average
                </span>
              </div>
              <Progress value={Math.round(objective.key_results.reduce((acc: number, kr: any) => acc + (kr.progress_percentage || 0), 0) / objective.key_results.length)} className="h-3" />
            </div>}

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
             
             {objective.key_results && objective.key_results.length > 0 ? <div className="space-y-2">
                 {objective.key_results.map((kr: any) => <div key={kr.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-purple-900">{kr.title}</span>
                       <div className="flex items-center space-x-2">
                         <Badge variant="outline" className="text-xs">
                           {kr.progress_percentage || 0}%
                         </Badge>
                         <ObjectiveCheckinForm objectiveId={objective.id} objectiveTitle={objective.title} trigger={<Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                               <Calendar className="h-3 w-3 mr-1" />
                               Check-in
                             </Button>} onSuccess={() => {
                    console.log('✅ KR weekly check-in saved successfully');
                  }} />
                       </div>
                     </div>
                     
                     <div className="space-y-1">
                       <div className="flex items-center justify-between text-xs">
                         <span className="text-purple-700 font-medium">Progress</span>
                         <span className="text-purple-900 font-medium">
                           {kr.current_value || 0} / {kr.target_value} {kr.unit || ''}
                         </span>
                       </div>
                       <Progress value={kr.progress_percentage || 0} className="h-2 bg-purple-200" />
                     </div>
                   </div>)}
               </div> : <>
                 {/* Display Individual Objectives as Key Results */}
                 {(() => {
              const individualObjs = getIndividualObjectivesForDepartment(objective.id);
              return individualObjs.length > 0 ? <div className="space-y-2">
                       <div className="text-xs text-gray-600 mb-2 italic">Individual Objectives contributing to this Department Objective:</div>
                       {individualObjs.map((indObj: any) => <div key={indObj.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-sm font-medium text-green-900">{indObj.title}</span>
                             <div className="flex items-center space-x-2">
                               <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                 {Math.round(indObj.progress_percentage || 0)}%
                               </Badge>
                               <Badge variant="outline" className="text-xs text-gray-600">
                                 Individual
                               </Badge>
                             </div>
                           </div>
                           
                           {indObj.description && <p className="text-xs text-green-800 mb-2">{indObj.description}</p>}
                           
                           <div className="space-y-1">
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-green-700 font-medium">Progress</span>
                               <span className="text-green-900 font-medium">
                                 {getEmployeeName(indObj.owner_id)}
                               </span>
                             </div>
                             <Progress value={indObj.progress_percentage || 0} className="h-2 bg-green-200" />
                           </div>
                           
                           {indObj.start_date && indObj.end_date && <div className="flex items-center justify-between text-xs text-green-700 mt-2">
                               <span>Start: {new Date(indObj.start_date).toLocaleDateString()}</span>
                               <span>End: {new Date(indObj.end_date).toLocaleDateString()}</span>
                             </div>}
                         </div>)}
                     </div> : <div className="border border-dashed border-gray-300 rounded-lg p-4">
                       <p className="text-sm text-gray-500 text-center">No key results or individual objectives yet</p>
                       <Button variant="outline" size="sm" onClick={() => handleCreateKR(objective)} className="mt-2 w-full">
                         <Plus className="h-4 w-4 mr-1" />
                         Add First Key Result
                       </Button>
                     </div>;
            })()}
               </>}
          </div>
        </AccordionContent>
      </AccordionItem>;
  };

  // Check if there are any objectives at all
  const hasAnyObjectives = departments.some(department => {
    const departmentObjectivesMap = objectivesByDepartmentAndStatus.get(department.id) || new Map();
    const activeObjectives = departmentObjectivesMap.get('active') || [];
    const draftObjectives = departmentObjectivesMap.get('draft') || [];
    const completedObjectives = departmentObjectivesMap.get('completed') || [];
    return activeObjectives.length > 0 || draftObjectives.length > 0 || completedObjectives.length > 0;
  });

  // Show empty state if no departments have any objectives
  if (!hasAnyObjectives) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full h-full">
            <CardContent className="flex flex-col items-center justify-center py-8 h-full">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-8 w-8 text-gray-400" />
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No department objectives
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md text-center">
                Start building department objectives by creating a new one or contributing to company objectives.
              </p>
              <div className="flex space-x-3">
                <Button onClick={() => {
                  if (departments.length > 0) {
                    handleCreateObjective(departments[0].id);
                  }
                }} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Objective
                </Button>
                <Button onClick={() => {
                  // Always open contribution modal, even if no departments yet
                  handleAddContribution(departments[0]?.id || '');
                }} size="sm" variant="outline" className="gap-2">
                  <Target className="h-4 w-4" />
                  Add Contribution
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TODO: Use ModalAddDepartmentContribution instead */}
        {/* <ModalCreateObjective
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organizationId}
          cycleId={cycleId || ''}
          departmentId={selectedDepartmentId}
          level="company" // Use company level since that's what we have
        /> */}

        {/* Add Department Contribution Modal */}
        <ModalAddDepartmentContribution
          open={showContributionModal}
          onOpenChange={setShowContributionModal}
          organizationId={organizationId}
          cycleId={finalCycleIds?.[0] || cycleId || ''}
          departmentId={selectedDepartmentId}
          onSuccess={() => {
            console.log('🎯 Department contribution created successfully');
          }}
        />
      </div>
    );
  }
  return <div className="h-full w-full flex flex-col">
      <div className="flex-1 w-full overflow-auto">
        <div className="space-y-4 pr-4 h-full">
          

          {/* Department List with Expand/Collapse */}
          <div className="space-y-2">
            {departments.filter(department => {
              // Filter out departments that are actually organization names
              const orgNamePatterns = [
                'PT Softorb Technology Indonesia',
                'Softorb Technology',
                'Softorb',
                'Technology Indonesia'
              ];
              return !orgNamePatterns.some(pattern => 
                department.name.toLowerCase().includes(pattern.toLowerCase())
              );
            }).map(department => {
            const departmentObjectivesMap = objectivesByDepartmentAndStatus.get(department.id) || new Map();
            const activeObjectives = departmentObjectivesMap.get('active') || [];
            const draftObjectives = departmentObjectivesMap.get('draft') || [];
            const completedObjectives = departmentObjectivesMap.get('completed') || [];
            const totalObjectives = activeObjectives.length + draftObjectives.length + completedObjectives.length;
            return <div key={department.id} className="border border-gray-200 rounded-lg">
              <Collapsible open={expandedDepartments.has(department.id)} onOpenChange={() => toggleDepartment(department.id)}>
                <CollapsibleTrigger asChild>
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedDepartments.has(department.id) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        <Building className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-900">{department.name}</span>
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
                              handleCreateObjective(department.id);
                            }} className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Objective
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => {
                              e.stopPropagation();
                              handleAddContribution(department.id);
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
                    {totalObjectives === 0 ? <DepartmentObjectivesEmptyState departmentName={department.name} onCreateObjective={() => handleCreateObjective(department.id)} onAddContribution={() => handleAddContribution(department.id)} /> : <div className="space-y-4">
                        {/* Active Objectives */}
                        {activeObjectives.length > 0 && <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">Active</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {activeObjectives.length}
                              </Badge>
                            </div>
                            <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                              {activeObjectives.map(objective => renderObjectiveCard(objective, department.id, 'active', 'border-l-green-500', 'text-green-600'))}
                            </Accordion>
                          </div>}

                        {/* Draft Objectives */}
                        {draftObjectives.length > 0 && <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Calendar className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-gray-900">Draft</span>
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                {draftObjectives.length}
                              </Badge>
                            </div>
                            <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                              {draftObjectives.map(objective => renderObjectiveCard(objective, department.id, 'draft', 'border-l-yellow-500', 'text-yellow-600'))}
                            </Accordion>
                          </div>}

                        {/* Completed Objectives */}
                        {completedObjectives.length > 0 && <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">Completed</span>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {completedObjectives.length}
                              </Badge>
                            </div>
                             <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective} className="space-y-2">
                               {completedObjectives.map(objective => renderObjectiveCard(objective, department.id, 'completed', 'border-l-blue-500', 'text-blue-600'))}
                             </Accordion>
                           </div>}

                        {/* Individual Objectives Section */}
                        
                      </div>}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>;
          })}
        </div>
      </div>
    </div>
      
      {/* TODO: Use ModalAddDepartmentContribution instead */}
      {/* <ModalCreateObjective open={showCreateDialog} onOpenChange={setShowCreateDialog} organizationId={organizationId} cycleId={cycleId || ''} departmentId={selectedDepartmentId} level="company" // Use company level since that's what we have
    /> */}

      {/* Add Department Contribution Modal */}
      <ModalAddDepartmentContribution 
        open={showContributionModal} 
        onOpenChange={setShowContributionModal} 
        organizationId={organizationId} 
        cycleId={finalCycleIds?.[0] || cycleId || ''} 
        departmentId={selectedDepartmentId}
        onSuccess={() => {
          console.log('🎯 Department contribution created successfully');
        }} 
      />

      {/* Create Key Result Dialog */}
      {createKRDialog.open && createKRDialog.objective && <CreateKeyResultDialog open={createKRDialog.open} onOpenChange={open => setCreateKRDialog({
      open
    })} objective={createKRDialog.objective} />}

      {/* Weekly Checkin History Dialog */}
      {historyDialog.open && <WeeklyCheckinHistoryDialog open={historyDialog.open} onOpenChange={open => setHistoryDialog({
      open
    })} organizationId={organizationId} keyResultId={historyDialog.keyResultId} objectiveId={historyDialog.objectiveId} objectiveTitle={historyDialog.objectiveTitle || ''} cycleId={historyDialog.cycleId} />}

      {/* Create Individual Objective Modal */}
      {selectedEmployee && <CreateIndividualObjectiveModal open={isCreateModalOpen} onOpenChange={open => {
      setIsCreateModalOpen(open);
      if (!open) {
        setSelectedEmployee(null);
      }
    }} organizationId={organizationId} cycleId={cycleId || ''} employeeId={selectedEmployee} employeeName={employees.find(emp => emp.id === selectedEmployee)?.full_name || 'Unknown Employee'} onSuccess={() => {
      console.log('✅ Individual objective created successfully');
    }} />}

      {/* Create Activity Modal */}
      {selectedObjectiveForActivity && <CreateActivityModal isOpen={showCreateActivityModal} onClose={() => {
      setShowCreateActivityModal(false);
      setSelectedObjectiveForActivity(null);
    }} organizationId={organizationId} objectiveId={selectedObjectiveForActivity.id} objectiveTitle={selectedObjectiveForActivity.title} employeeId={selectedObjectiveForActivity.employeeId} />}

      {/* Edit Department Objective Modal */}
      {editModal.open && editModal.objective && (
        <ModalAddDepartmentContribution
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open })}
          organizationId={organizationId}
          cycleId={cycleId || ''}
          departmentId={editModal.objective.department_id}
          editObjective={editModal.objective}
          onSuccess={() => {
            console.log('✅ Department objective updated successfully');
            setEditModal({ open: false });
          }}
        />
      )}
    </div>;
};