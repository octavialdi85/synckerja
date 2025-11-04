import React, { useState, useMemo } from 'react';
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
}

export const ObjectiveHierarchyDialog: React.FC<ObjectiveHierarchyDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  selectedObjectiveId,
  organizationId,
  cycleIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedObjectiveId);

  // Fetch Company Objectives with nested Department Objectives
  const { data: companyObjectives = [], isLoading: isLoadingCompany } = useObjectives(
    organizationId,
    cycleIds[0], // Use first cycle ID for company objectives
    'company'
  );

  // Fetch Individual Objectives
  const { data: individualObjectives = [], isLoading: isLoadingIndividual } = useIndividualObjectives(
    organizationId,
    cycleIds
  );

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

      return {
        id: company.id,
        title: company.title,
        status: company.status,
        progress_percentage: (company as any).progress_percentage || 0,
        departments,
      };
    });

    return result;
  }, [companyObjectives, individualObjectives]);

  // Get standalone Individual Objectives (without department)
  const standaloneObjectives = useMemo(() => {
    return individualObjectives.filter(
      (indiv) => !indiv.department_objective_id
    );
  }, [individualObjectives]);

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

  // Get default expanded companies (all by default)
  const defaultExpandedCompanies = useMemo(() => {
    return hierarchy.map((c) => c.id);
  }, [hierarchy]);

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
  const hasData = hierarchy.length > 0 || standaloneObjectives.length > 0;

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
            <div className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900 mb-1">No objectives available</p>
              <p className="text-xs text-gray-500">Please create individual objectives first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Company Objectives with Departments */}
              {filteredHierarchy.length > 0 && (
                <Accordion type="multiple" defaultValue={defaultExpandedCompanies} className="w-full">
                  {filteredHierarchy.map((company) => (
                    <AccordionItem key={company.id} value={company.id} className="border-b border-gray-200">
                      <div>
                        <AccordionTrigger className="hover:no-underline py-3 px-4 [&>svg]:hidden">
                          <div className="flex items-center gap-2 flex-1 w-full min-w-0">
                            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs flex-shrink-0">
                              Company
                            </Badge>
                            <div className="flex-1 min-w-0 overflow-hidden pr-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm font-medium text-gray-900 block text-left truncate w-full">
                                      {company.title}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{company.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400" />
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
                        <div className="pl-6 space-y-2">
                          {company.departments.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No departments yet</p>
                          ) : (
                            <Accordion type="multiple" className="w-full">
                              {company.departments.map((dept) => (
                                <AccordionItem key={dept.id} value={dept.id} className="border-b border-gray-100">
                                  <div>
                                    <AccordionTrigger className="hover:no-underline py-2 px-4 [&>svg]:hidden">
                                      <div className="flex items-center gap-2 flex-1 w-full min-w-0">
                                        <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs flex-shrink-0">
                                          Department
                                        </Badge>
                                        <div className="flex-1 min-w-0 overflow-hidden pr-4">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="text-sm text-gray-800 block text-left truncate w-full">
                                                  {dept.title}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="max-w-xs">{dept.title}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400" />
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
                                    <div className="pl-6 space-y-1">
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
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Standalone Individual Objectives</h3>
                  </div>
                  <div className="space-y-1">
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

