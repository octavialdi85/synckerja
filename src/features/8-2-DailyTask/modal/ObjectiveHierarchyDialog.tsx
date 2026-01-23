import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/features/ui/accordion';
import { Search, Building2, Users, Check, Target, Loader2, ChevronDown } from 'lucide-react';
import { useObjectives } from '@/features/1_home/components/HomeOKRDashboard/component/ObjectivesTabImport/useObjectives';
import { useCompanyObjectives } from '@/features/2-8-dashboard/hooks/useCompanyObjectives';
import { useDepartmentObjectives } from '@/features/1_home/components/HomeOKRDashboard/modal/useDepartmentObjectives';
import { useIndividualObjectives } from '@/features/1_home/components/HomeOKRDashboard/modal/useIndividualObjectives';
import { Progress } from '@/features/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/features/ui/tooltip';
import { cn } from '@/lib/utils';

interface CompanyObjective {
  id: string;
  title: string;
  status: string;
  progress_percentage?: number;
  department_objectives?: Array<{
    id: string;
    title: string;
    status: string;
    progress_percentage: number;
    weight: number;
  }>;
  key_results?: Array<{
    id: string;
    title: string;
    status: string;
    progress_percentage?: number;
  }>;
}

interface IndividualObjective {
  id: string;
  title: string;
  status: string;
  progress_percentage?: number;
  department_objective_id?: string | null;
  employee_id: string;
  employees?: { full_name: string };
}

interface ObjectiveHierarchyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (individualObjectiveId: string, context: {
    companyTitle?: string;
    departmentTitle?: string;
    individualTitle: string;
  }) => void;
  selectedObjectiveId?: string;
  organizationId: string;
  cycleIds: string[];
  planDate?: Date | null; // Optional plan date to filter cycles
}

export const ObjectiveHierarchyDialog: React.FC<ObjectiveHierarchyDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  selectedObjectiveId,
  organizationId,
  cycleIds,
  planDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedObjectiveId);
  const [expandedCompany, setExpandedCompany] = useState<string | undefined>(undefined);
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, string | undefined>>({});

  // ⚡ OPTIMIZED: Fetch ALL company objectives once, then filter client-side by cycleIds
  // This eliminates double fetch (one with undefined cycleIds, one with array)
  const { data: allCompanyObjectivesRaw = [], isLoading: isLoadingCompany } = useCompanyObjectives(
    organizationId,
    undefined // Always fetch all, filter client-side
  );

  // Filter company objectives by cycleIds client-side if needed
  const companyObjectivesRaw = React.useMemo(() => {
    if (!allCompanyObjectivesRaw || allCompanyObjectivesRaw.length === 0) return [];
    if (cycleIds.length === 0) return allCompanyObjectivesRaw;
    
    // Filter by cycleIds if provided
    const validCycleIds = cycleIds.filter(id => id && typeof id === 'string');
    if (validCycleIds.length === 0) return allCompanyObjectivesRaw;
    
    return allCompanyObjectivesRaw.filter((co: any) => 
      co.cycle_id && validCycleIds.includes(co.cycle_id)
    );
  }, [allCompanyObjectivesRaw, cycleIds]);

  // ⚡ OPTIMIZED: Fetch ALL department objectives once, then filter client-side
  // This eliminates double fetch (one with cycleIds, one without)
  const { data: allDepartmentObjectivesRaw = [] } = useDepartmentObjectives(
    organizationId,
    undefined, // Fetch all department objectives
    false // Don't include individual objectives
  );

  // Filter department objectives by cycleIds client-side if needed
  const departmentObjectivesRaw = React.useMemo(() => {
    if (!allDepartmentObjectivesRaw || allDepartmentObjectivesRaw.length === 0) return [];
    if (cycleIds.length === 0) return allDepartmentObjectivesRaw;
    
    // Filter by cycleIds if provided
    const validCycleIds = cycleIds.filter(id => id && typeof id === 'string');
    if (validCycleIds.length === 0) return allDepartmentObjectivesRaw;
    
    return allDepartmentObjectivesRaw.filter((dept: any) => 
      dept.cycle_id && validCycleIds.includes(dept.cycle_id)
    );
  }, [allDepartmentObjectivesRaw, cycleIds]);

  // Transform company objectives to include their department objectives
  const companyObjectives = React.useMemo(() => {
    if (!companyObjectivesRaw || companyObjectivesRaw.length === 0) return [];
    
    // Get company objective IDs from filtered results
    const companyObjectiveIds = new Set(companyObjectivesRaw.map((co: any) => co.id));
    
    // Group department objectives by company_objective_id
    // Use filtered department objectives (same cycle) first, then fallback to all if needed
    const deptByCompany = new Map<string, any[]>();
    
    // First, try filtered department objectives (same cycle)
    departmentObjectivesRaw.forEach((dept: any) => {
      if (dept.company_objective_id && companyObjectiveIds.has(dept.company_objective_id)) {
        if (!deptByCompany.has(dept.company_objective_id)) {
          deptByCompany.set(dept.company_objective_id, []);
        }
        deptByCompany.get(dept.company_objective_id)!.push(dept);
      }
    });
    
    // If no department objectives found for filtered cycles, try to find any department objectives
    // linked to the company objectives (even if cycle_id differs)
    if (deptByCompany.size === 0) {
      allDepartmentObjectivesRaw.forEach((dept: any) => {
        if (dept.company_objective_id && companyObjectiveIds.has(dept.company_objective_id)) {
          if (!deptByCompany.has(dept.company_objective_id)) {
            deptByCompany.set(dept.company_objective_id, []);
          }
          deptByCompany.get(dept.company_objective_id)!.push(dept);
        }
      });
    }

    // Map company objectives with their department objectives
    return companyObjectivesRaw.map((co: any) => ({
      ...co,
      department_objectives: deptByCompany.get(co.id) || [],
      key_results: deptByCompany.get(co.id) || [] // Also set as key_results for compatibility
    }));
  }, [companyObjectivesRaw, departmentObjectivesRaw, allDepartmentObjectivesRaw]);

  // Fetch Individual Objectives - filtered by cycle
  const { data: individualObjectivesFiltered = [], isLoading: isLoadingIndividualFiltered } = useIndividualObjectives(
    organizationId,
    cycleIds
  );
  
  // Also fetch ALL individual objectives to find ones linked to department objectives (even if cycle_id differs)
  const { data: individualObjectivesAll = [] } = useIndividualObjectives(
    organizationId,
    undefined // Fetch all individual objectives
  );
  
  // Use filtered individual objectives, but also include ones linked to department objectives we're showing
  const departmentObjectiveIds = React.useMemo(() => {
    const ids = new Set<string>();
    companyObjectives.forEach((co: any) => {
      const depts = co.department_objectives || co.key_results || [];
      depts.forEach((dept: any) => {
        ids.add(dept.id);
      });
    });
    return ids;
  }, [companyObjectives]);
  
  const individualObjectives = React.useMemo(() => {
    // Start with filtered individual objectives
    const result = [...individualObjectivesFiltered];
    
    // If we have department objectives but no individual objectives in filtered results,
    // add individual objectives linked to those department objectives (even if cycle_id differs)
    if (departmentObjectiveIds.size > 0 && individualObjectivesFiltered.length === 0) {
      individualObjectivesAll.forEach((indiv: any) => {
        if (indiv.department_objective_id && departmentObjectiveIds.has(indiv.department_objective_id)) {
          // Avoid duplicates
          if (!result.find(r => r.id === indiv.id)) {
            result.push(indiv);
          }
        }
      });
    }
    
    return result;
  }, [individualObjectivesFiltered, individualObjectivesAll, departmentObjectiveIds]);
  
  const isLoadingIndividual = isLoadingIndividualFiltered;

  // Build hierarchy structure
  const hierarchy = useMemo(() => {
    if (!companyObjectives || !individualObjectives) return [];

    // Create maps for quick lookup
    const departmentMap = new Map<string, {
      id: string;
      title: string;
      status: string;
      progress_percentage: number;
      companyObjectiveId: string;
      individuals: IndividualObjective[];
    }>();

    // Process company objectives to extract departments
    // useObjectives returns department_objectives as nested or as key_results
    (companyObjectives as any[]).forEach((company) => {
      // Check both department_objectives and key_results (transformed format)
      const departments = company.department_objectives || company.key_results || [];
      departments.forEach((dept: any) => {
        departmentMap.set(dept.id, {
          id: dept.id,
          title: dept.title,
          status: dept.status || 'active',
          progress_percentage: dept.progress_percentage || 0,
          companyObjectiveId: company.id,
          individuals: [],
        });
      });
    });

    // Attach individual objectives to departments
    individualObjectives.forEach((indiv) => {
      if (indiv.department_objective_id && departmentMap.has(indiv.department_objective_id)) {
        const dept = departmentMap.get(indiv.department_objective_id)!;
        dept.individuals.push(indiv);
      }
    });

    // Calculate department progress from individual objectives if available
    departmentMap.forEach((dept) => {
      if (dept.individuals.length > 0) {
        // Calculate average progress from individual objectives
        const totalIndividualProgress = dept.individuals.reduce((sum, indiv) => {
          return sum + (indiv.progress_percentage || 0);
        }, 0);
        dept.progress_percentage = totalIndividualProgress / dept.individuals.length;
      }
      // If no individual objectives, keep the original progress from key_results
    });

    // Build final hierarchy
    const result = (companyObjectives as any[]).map((company) => {
      // Check both department_objectives and key_results (transformed format)
      const departmentsData = company.department_objectives || company.key_results || [];
      const departments = departmentsData.map((dept: any) => {
        const deptData = departmentMap.get(dept.id);
        return deptData || {
          id: dept.id,
          title: dept.title,
          status: dept.status || 'active',
          progress_percentage: dept.progress_percentage || 0,
          companyObjectiveId: company.id,
          individuals: [],
        };
      });

      // Calculate company objective progress from department objectives
      // If there are department objectives, calculate average progress
      let calculatedProgress = (company as any).progress_percentage || 0;
      if (departments.length > 0) {
        const totalDeptProgress = departments.reduce((sum, dept) => {
          return sum + (dept.progress_percentage || 0);
        }, 0);
        calculatedProgress = totalDeptProgress / departments.length;
      }

      return {
        id: company.id,
        title: company.title,
        status: company.status,
        progress_percentage: calculatedProgress,
        departments,
      };
    });

    return result;
  }, [companyObjectives, individualObjectives]);

  // Get standalone Individual Objectives (without department)
  // Also include individual objectives that have department_objective_id but no matching department in hierarchy
  const standaloneObjectives = useMemo(() => {
    // Get all department IDs that exist in the hierarchy
    const departmentIdsInHierarchy = new Set<string>();
    hierarchy.forEach(company => {
      company.departments.forEach(dept => {
        departmentIdsInHierarchy.add(dept.id);
      });
    });

    // Standalone = no department_objective_id OR department_objective_id not in hierarchy
    return individualObjectives.filter(
      (indiv) => {
        if (!indiv.department_objective_id) {
          return true; // Truly standalone
        }
        // Has department_objective_id but department not in hierarchy (no company objectives)
        return !departmentIdsInHierarchy.has(indiv.department_objective_id);
      }
    );
  }, [individualObjectives, hierarchy]);

  // Filter hierarchy based on search query
  const filteredHierarchy = useMemo(() => {
    if (!searchQuery.trim()) return hierarchy;

    const query = searchQuery.toLowerCase();
    return hierarchy
      .map((company) => {
        const companyMatches = company.title.toLowerCase().includes(query);
        const departments = company.departments
          .map((dept) => {
            const deptMatches = dept.title.toLowerCase().includes(query);
            const individuals = dept.individuals.filter((indiv) =>
              indiv.title.toLowerCase().includes(query) ||
              indiv.employees?.full_name.toLowerCase().includes(query)
            );
            return {
              ...dept,
              individuals,
              deptMatches, // Store deptMatches in the object
            };
          })
          .filter((dept) => dept.deptMatches || dept.individuals.length > 0)
          .map(({ deptMatches, ...dept }) => dept); // Remove deptMatches before returning

        return {
          ...company,
          departments: departments.length > 0 || companyMatches ? departments : [],
        };
      })
      .filter((company) => company.departments.length > 0 || company.title.toLowerCase().includes(query));
  }, [hierarchy, searchQuery]);

  // Filter standalone objectives
  const filteredStandalone = useMemo(() => {
    if (!searchQuery.trim()) return standaloneObjectives;
    const query = searchQuery.toLowerCase();
    return standaloneObjectives.filter(
      (indiv) =>
        indiv.title.toLowerCase().includes(query) ||
        indiv.employees?.full_name.toLowerCase().includes(query)
    );
  }, [standaloneObjectives, searchQuery]);

  const handleCompanyChange = (value: string | undefined) => {
    setExpandedCompany(value);
    // Reset expanded department when company changes
    if (value) {
      setExpandedDepartments(prev => ({ ...prev, [value]: undefined }));
    }
  };

  const handleDepartmentChange = (companyId: string, value: string | undefined) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [companyId]: value
    }));
  };

  const handleSelect = (indiv: IndividualObjective, companyTitle?: string, departmentTitle?: string) => {
    setSelectedId(indiv.id);
    onSelect(indiv.id, {
      companyTitle,
      departmentTitle,
      individualTitle: indiv.title,
    });
    onOpenChange(false);
  };

  const isLoading = isLoadingCompany || isLoadingIndividual;
  // Show data if we have hierarchy OR standalone objectives OR any individual objectives (even if no company objectives)
  const hasData = hierarchy.length > 0 || standaloneObjectives.length > 0 || individualObjectives.length > 0;

  // Debug logging
  useEffect(() => {
    if (!isLoading && open) {
      console.log('🔍 ObjectiveHierarchyDialog Debug:', {
        organizationId,
        cycleIds,
        companyObjectivesCount: companyObjectivesRaw.length,
        departmentObjectivesCount: departmentObjectivesRaw.length,
        individualObjectivesCount: individualObjectives.length,
        hierarchyCount: hierarchy.length,
        standaloneObjectivesCount: standaloneObjectives.length,
        hasData,
        companyObjectives: companyObjectivesRaw.map(co => ({ id: co.id, title: co.title, cycle_id: co.cycle_id })),
        departmentObjectives: departmentObjectivesRaw.map(dept => ({ id: dept.id, title: dept.title, cycle_id: dept.cycle_id, company_objective_id: dept.company_objective_id })),
        individualObjectives: individualObjectives.map(indiv => ({ id: indiv.id, title: indiv.title, cycle_id: (indiv as any).cycle_id, department_objective_id: indiv.department_objective_id }))
      });
    }
  }, [organizationId, cycleIds, companyObjectivesRaw, departmentObjectivesRaw, individualObjectives, hierarchy, standaloneObjectives, hasData, isLoading, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Individual Objective</DialogTitle>
          <DialogDescription>
            Choose an individual objective from the hierarchy. Only individual objectives can be selected.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-3 w-full"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Loading objectives...</p>
              </div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Target className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900 mb-1">No objectives available</p>
              <p className="text-xs text-gray-500 text-center">
                Please create individual objectives first in the OKR page.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-x-hidden">
              {/* Company Objectives with Departments */}
              {filteredHierarchy.length > 0 && (
                <Accordion 
                  type="single" 
                  value={expandedCompany}
                  onValueChange={handleCompanyChange}
                  collapsible
                  className="w-full overflow-x-hidden"
                >
                  {filteredHierarchy.map((company) => (
                    <AccordionItem key={company.id} value={company.id} className="border-b border-gray-200 overflow-x-hidden">
                      <div className="overflow-x-hidden">
                        <AccordionTrigger className="hover:no-underline py-3 px-4 [&>svg]:hidden overflow-x-hidden w-full">
                          <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs flex-shrink-0 whitespace-nowrap">
                              Company
                            </Badge>
                            <div className="flex-1 min-w-0 max-w-full overflow-hidden pr-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm font-medium text-gray-900 block text-left truncate w-full max-w-full">
                                      {company.title}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{company.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400 flex-shrink-0" />
                          </div>
                        </AccordionTrigger>
                        <div className="px-4 pb-2">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={company.progress_percentage || 0} 
                              className="flex-1 h-2 min-w-0"
                            />
                            <span className="text-xs font-medium text-gray-600 w-12 text-right flex-shrink-0">
                              {Math.round(company.progress_percentage || 0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <AccordionContent>
                        <div className="pl-6 space-y-2 overflow-x-hidden">
                          {company.departments.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No departments yet</p>
                          ) : (
                            <Accordion 
                              type="single" 
                              value={expandedDepartments[company.id]}
                              onValueChange={(value) => handleDepartmentChange(company.id, value)}
                              collapsible
                              className="w-full overflow-x-hidden"
                            >
                              {company.departments.map((dept) => (
                                <AccordionItem key={dept.id} value={dept.id} className="border-b border-gray-100 overflow-x-hidden">
                                  <div className="overflow-x-hidden">
                                    <AccordionTrigger className="hover:no-underline py-2 px-4 [&>svg]:hidden overflow-x-hidden w-full">
                                      <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                                        <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs flex-shrink-0 whitespace-nowrap">
                                          Department
                                        </Badge>
                                        <div className="flex-1 min-w-0 max-w-full overflow-hidden pr-4">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="text-sm text-gray-800 block text-left truncate w-full max-w-full">
                                                  {dept.title}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="max-w-xs">{dept.title}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400 flex-shrink-0" />
                                      </div>
                                    </AccordionTrigger>
                                    <div className="px-4 pb-2">
                                      <div className="flex items-center gap-2">
                                        <Progress 
                                          value={dept.progress_percentage || 0} 
                                          className="flex-1 h-2 min-w-0"
                                        />
                                        <span className="text-xs font-medium text-gray-600 w-12 text-right flex-shrink-0">
                                          {Math.round(dept.progress_percentage || 0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <AccordionContent>
                                    <div className="pl-6 pr-1 space-y-1 overflow-x-hidden">
                                      {dept.individuals.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">No individual objectives yet</p>
                                      ) : (
                                        dept.individuals.map((indiv) => (
                                          <button
                                            key={indiv.id}
                                            onClick={() => handleSelect(indiv, company.title, dept.title)}
                                            className={cn(
                                              "w-full text-left p-2 rounded-md border transition-colors",
                                              "hover:bg-blue-50 hover:border-blue-300",
                                              selectedId === indiv.id
                                                ? "bg-blue-100 border-blue-600 border-2"
                                                : "bg-white border-gray-200"
                                            )}
                                            style={{ maxWidth: 'calc(100% - 0.5rem)' }}
                                          >
                                            <div className="space-y-2">
                                              {/* Title row with badge and title */}
                                              <div className="flex items-center gap-2 min-w-0">
                                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs flex-shrink-0">
                                                  Individual
                                                </Badge>
                                                <div className="flex-1 min-w-0 pr-10">
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <span className="text-sm font-medium text-gray-900 block text-left truncate">
                                                          {indiv.title}
                                                        </span>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p className="max-w-xs">{indiv.title}</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </div>
                                                {selectedId === indiv.id && (
                                                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                )}
                                              </div>
                                              
                                              {/* Employee name */}
                                              {indiv.employees?.full_name && (
                                                <div className="text-xs text-gray-500">
                                                  👤 {indiv.employees.full_name}
                                                </div>
                                              )}
                                              
                                              {/* Progress bar - full width */}
                                              <div className="flex items-center gap-2">
                                                <Progress 
                                                  value={indiv.progress_percentage || 0} 
                                                  className="flex-1 h-1.5 min-w-0"
                                                />
                                                <span className="text-xs font-medium text-gray-600 w-10 text-right flex-shrink-0">
                                                  {Math.round(indiv.progress_percentage || 0)}%
                                                </span>
                                              </div>
                                              
                                              {/* Description - full width */}
                                              <div className="text-xs text-gray-400">
                                                📍 {company.title} → {dept.title} → {indiv.title}
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {/* Standalone Individual Objectives */}
              {filteredStandalone.length > 0 && (
                <div className="border-t border-gray-200 pt-4 overflow-x-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Standalone Individual Objectives</h3>
                  </div>
                  <div className="space-y-1 overflow-x-hidden pr-1">
                    {filteredStandalone.map((indiv) => (
                      <button
                        key={indiv.id}
                        onClick={() => handleSelect(indiv)}
                        className={cn(
                          "w-full text-left p-2 rounded-md border transition-colors",
                          "hover:bg-blue-50 hover:border-blue-300",
                          selectedId === indiv.id
                            ? "bg-blue-100 border-blue-600 border-2"
                            : "bg-white border-gray-200"
                        )}
                        style={{ maxWidth: 'calc(100% - 0.5rem)' }}
                      >
                        <div className="space-y-2">
                          {/* Title row with badge and title */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs flex-shrink-0">
                              Individual
                            </Badge>
                            <div className="flex-1 min-w-0 pr-10">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm font-medium text-gray-900 block text-left truncate">
                                      {indiv.title}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{indiv.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {selectedId === indiv.id && (
                              <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          {/* Employee name */}
                          {indiv.employees?.full_name && (
                            <div className="text-xs text-gray-500">
                              👤 {indiv.employees.full_name}
                            </div>
                          )}
                          
                          {/* Progress bar - full width */}
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={indiv.progress_percentage || 0} 
                              className="flex-1 h-1.5 min-w-0"
                            />
                            <span className="text-xs font-medium text-gray-600 w-10 text-right flex-shrink-0">
                              {Math.round(indiv.progress_percentage || 0)}%
                            </span>
                          </div>
                          
                          {/* Description - full width */}
                          <div className="text-xs text-gray-400 italic">
                            (No Department)
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results after search */}
              {filteredHierarchy.length === 0 && filteredStandalone.length === 0 && searchQuery.trim() && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No objectives found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

