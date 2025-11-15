import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface AssignmentRow {
  id: string;
  type: 'step' | 'substep'; // NEW: untuk identifikasi type assignment
  task_step_id?: string; // Optional: hanya untuk step assignments
  task_steps_to_steps_id?: string; // NEW: hanya untuk sub-step assignments
  task_steps_to_steps_assigned_id?: string; // NEW: ID assignment sub-step (untuk fetch due_date)
  assigned_at: string;
  employee: { id: string; full_name: string; email?: string } | null;
  step: { id: string; title: string; updated_at: string | null; completed_at: string | null; is_completed: boolean; task?: { id: string; title: string } } | null; // Parent step (untuk sub-step juga)
  subStep?: { id: string; title: string; parent_step_id: string; is_completed: boolean; completed_at: string | null } | null; // NEW: untuk sub-step details
  due_date: string | null;
}

export interface ComputedPerformanceRow {
  assignmentId: string;
  employeeId: string | null;
  employeeName: string;
  stepId: string | null;
  stepTitle: string;
  taskTitle: string;
  assignedAt: string | null; // Assignment date/time
  dueDate: string | null;
  finishedAt: string | null;
  isCompleted: boolean;
  isOnTime: boolean | null;
  lateDays: number | null;
  subStepTitle?: string | null;
  subStepId?: string | null; // NEW: untuk identifikasi sub-step
  type?: 'step' | 'substep'; // NEW: untuk identifikasi type
}

interface ReportContextType {
  loading: boolean;
  performance: ComputedPerformanceRow[];
  filtered: ComputedPerformanceRow[];
  blockers: any[];
  recentUpdates: any[];
  filteredBlockers: any[];
  filteredRecentUpdates: any[];
  filters: { 
    search: string; 
    status: 'all' | 'ontime' | 'late'; 
    timePeriod: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
    customStart?: string | null;
    customEnd?: string | null;
    pic?: string;
    task?: string;
    step?: string;
    subStep?: string;
  };
  updateFilter: (key: 'search' | 'status' | 'timePeriod' | 'customStart' | 'customEnd' | 'pic' | 'task' | 'step' | 'subStep', value: string) => void;
  options: { pics: string[]; tasks: string[]; steps: string[]; subSteps: string[] };
  getBlockersForStep: (stepId: string) => any[];
  formatDateRangeDisplay: () => string;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const useDailyTaskReport = () => {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useDailyTaskReport must be used within DailyTaskReportProvider');
  return ctx;
};

export const DailyTaskReportProvider = ({ children }: { children: React.ReactNode }) => {
  const { organizationId } = useCurrentOrg();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ 
    search: string; 
    status: 'all' | 'ontime' | 'late'; 
    timePeriod: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';
    customStart?: string | null; customEnd?: string | null;
    pic?: 'all' | string; task?: 'all' | string; step?: 'all' | string; subStep?: 'all' | string;
  }>({
    search: '',
    status: 'all',
    timePeriod: 'this_week',
    customStart: null,
    customEnd: null,
    pic: 'all',
    task: 'all',
    step: 'all',
    subStep: 'all'
  });
  const [blockerCountByStep, setBlockerCountByStep] = useState<Record<string, number>>({});
  const [blockersByStep, setBlockersByStep] = useState<Record<string, any[]>>({});
  const [completionDateMap, setCompletionDateMap] = useState<Record<string, string>>({});
  const isLoadingOrgRef = useRef(false);
  const inFlightOrgRef = useRef<string | null>(null);

  // Feature flag untuk gradual rollout (default: true, can disable via env)
  const USE_OPTIMIZED_HISTORY_API = import.meta.env.VITE_USE_OPTIMIZED_HISTORY_API !== 'false';
  const BATCH_SIZE = 25; // Reduced from 50 to prevent timeout with large datasets
  const MAX_CONCURRENT_BATCHES = 2; // Reduced concurrency

  // Optimized fetchHistoryBatch dengan backward compatible fallback
  const fetchHistoryBatch = async (
    stepIds: string[],
    subStepIds: string[],
    limit = BATCH_SIZE,
    options?: {
      cursor?: { id: string; created_at: string };
      useOptimized?: boolean;
    }
  ): Promise<any[]> => {
    if (stepIds.length === 0 && subStepIds.length === 0) {
      return [];
    }

    const useOptimized = options?.useOptimized ?? USE_OPTIMIZED_HISTORY_API;

    // For large datasets (>100 total IDs), use batch processing
    if ((stepIds.length + subStepIds.length) > 100) {
      return fetchHistoryBatchLarge(stepIds, subStepIds, limit, options);
    }

    // Try optimized API first if enabled and organizationId available
    if (useOptimized && organizationId) {
      try {
        const { data, error } = await supabase.rpc('get_task_step_history_batch_v2', {
          p_organization_id: organizationId,
          p_task_step_ids: stepIds.length ? stepIds : null,
          p_sub_step_ids: subStepIds.length ? subStepIds : null,
          p_limit: limit,
          p_cursor_id: options?.cursor?.id || null,
          p_cursor_created_at: options?.cursor?.created_at || null,
        });

        if (!error && data) {
          if (import.meta.env.DEV) {
            console.log(
              '📚 History batch fetch (optimized)',
              `steps=${stepIds.length} subSteps=${subStepIds.length} returned=${data?.length || 0}`
            );
          }
          // Extract actual history items (remove pagination metadata)
          return data.map((item: any) => {
            const { next_cursor_id, next_cursor_created_at, has_more, ...historyItem } = item;
            return historyItem;
          });
        }

        // If error but not critical, fall through to old API
        if (error && !error.message?.includes('organization_id is required')) {
          console.warn('⚠️ Optimized API error, falling back to old API:', error.message);
        }
      } catch (err: any) {
        // Non-critical error, fall back to old API
        if (import.meta.env.DEV) {
          console.warn('⚠️ Optimized API failed, falling back to old API:', err?.message || err);
        }
      }
    }

    // Fallback to old API (backward compatible)
    try {
      const { data, error } = await supabase.rpc('get_task_step_history_batch', {
        p_task_step_ids: stepIds.length ? stepIds : null,
        p_sub_step_ids: subStepIds.length ? subStepIds : null,
        p_limit: limit,
        p_offset: 0,
      });

      if (error) {
        console.error('❌ Failed to fetch task_step_history batch', error);
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log(
          '📚 History batch fetch (legacy)',
          `steps=${stepIds.length} subSteps=${subStepIds.length} returned=${data?.length || 0}`
        );
      }

      return data || [];
    } catch (error) {
      console.error('❌ History fetch failed with both APIs:', error);
      throw error;
    }
  };

  // Batch processing untuk large datasets (>100 IDs)
  const fetchHistoryBatchLarge = async (
    stepIds: string[],
    subStepIds: string[],
    limit: number,
    options?: {
      cursor?: { id: string; created_at: string };
    }
  ): Promise<any[]> => {
    // Split into smaller batches
    const stepBatches: string[][] = [];
    const subStepBatches: string[][] = [];
    
    for (let i = 0; i < stepIds.length; i += BATCH_SIZE) {
      stepBatches.push(stepIds.slice(i, i + BATCH_SIZE));
    }
    
    for (let i = 0; i < subStepIds.length; i += BATCH_SIZE) {
      subStepBatches.push(subStepIds.slice(i, i + BATCH_SIZE));
    }

    const allResults: any[] = [];
    const totalBatches = Math.max(stepBatches.length, subStepBatches.length);

    // Process batches with concurrency limit
    for (let i = 0; i < totalBatches; i += MAX_CONCURRENT_BATCHES) {
      const batchPromises = [];
      
      for (let j = 0; j < MAX_CONCURRENT_BATCHES && (i + j) < totalBatches; j++) {
        const stepBatch = stepBatches[i + j] || [];
        const subStepBatch = subStepBatches[i + j] || [];
        
        if (stepBatch.length > 0 || subStepBatch.length > 0) {
          batchPromises.push(
            fetchHistoryBatch(stepBatch, subStepBatch, limit, options).catch((error) => {
              console.error('❌ Batch fetch error:', error);
              return [];
            })
          );
        }
      }

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults.flat());
      
      // Small delay between batch groups to prevent overwhelming DB
      if (i + MAX_CONCURRENT_BATCHES < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Deduplicate results by id
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    );

    if (import.meta.env.DEV) {
      console.log(
        '📚 History batch fetch (large dataset)',
        `steps=${stepIds.length} subSteps=${subStepIds.length} returned=${uniqueResults.length}`
      );
    }

    return uniqueResults;
  };

  useEffect(() => {
    if (!organizationId) return;

    // Prevent duplicate loads for the same org (e.g., React strict mode)
    if (isLoadingOrgRef.current && inFlightOrgRef.current === organizationId) {
      console.debug('⏭️ Skipping duplicate report load for org:', organizationId);
      return;
    }

    isLoadingOrgRef.current = true;
    inFlightOrgRef.current = organizationId;
    let isActive = true;

    const load = async () => {
      setLoading(true);
      try {
        // STEP 1: PARALLEL - Fetch step and sub-step assignments (optimized)
        const [stepAssignsResult, subStepAssignsResult] = await Promise.all([
          // Fetch step assignments (existing query)
          supabase
            .from('task_steps_assigned')
            .select(`
              id, task_step_id, assigned_at,
              employee:employees!employee_id(id, full_name, email),
              step:task_steps(id, title, updated_at, completed_at, is_completed, task:daily_tasks(id, title)),
              task_steps_assigned_duedate(due_date, created_at)
            `)
            .eq('organization_id', organizationId),
          
          // NEW: Fetch sub-step assignments (simple query, no deep joins to avoid timeout)
          supabase
            .from('task_steps_to_steps_assigned')
            .select('id, task_steps_to_steps_id, assigned_at, employee_id, organization_id')
            .eq('organization_id', organizationId)
        ]);

        if (stepAssignsResult.error) {
          console.error('❌ Error fetching step assignments:', stepAssignsResult.error);
          throw stepAssignsResult.error;
        }

        if (subStepAssignsResult.error) {
          console.error('❌ Error fetching sub-step assignments:', subStepAssignsResult.error);
          // Don't throw - continue with step assignments only
          console.warn('⚠️ Continuing without sub-step assignments');
        }

        // Map step assignments
        const stepMapped: AssignmentRow[] = (stepAssignsResult.data || []).map((a: any) => ({
          id: a.id,
          type: 'step' as const,
          task_step_id: a.task_step_id,
          assigned_at: a.assigned_at,
          employee: a.employee || null,
          step: a.step || null,
          due_date: (a.task_steps_assigned_duedate || [])
            .sort((x: any, y: any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0]?.due_date || null,
        }));

        // Build step assignment map untuk lookup (untuk fallback employee dan due_date)
        const stepAssignmentMap: Record<string, AssignmentRow> = {};
        stepMapped.forEach((row) => {
          if (row.task_step_id) {
            stepAssignmentMap[row.task_step_id] = row;
          }
        });

        // NEW: Fetch ALL sub-steps from assigned steps (not just assigned sub-steps)
        const assignedStepIds = [...new Set(stepMapped.map((r: any) => r.task_step_id).filter(Boolean))] as string[];

        // Process sub-step assignments: fetch details separately (avoid deep nested joins)
        const subStepAssigns = subStepAssignsResult.data || [];
        
        let subStepDetailsMap: Record<string, any> = {};
        let parentStepMap: Record<string, any> = {};
        let subStepDueDatesMap: Record<string, string | null> = {};
        let allSubSteps: any[] = [];

        // NEW: Fetch ALL sub-steps for assigned steps (not just assigned sub-steps)
        if (assignedStepIds.length > 0) {
          const { data: allSubStepsData } = await supabase
            .from('task_steps_to_steps')
            .select('id, title, parent_step_id, is_completed, completed_at')
            .in('parent_step_id', assignedStepIds);

          allSubSteps = allSubStepsData || [];
          console.log(`📋 Found ${allSubSteps.length} total sub-steps for ${assignedStepIds.length} assigned steps`);

          if (allSubSteps.length > 0) {
            // Build sub-step details map
            allSubSteps.forEach((sub: any) => {
              subStepDetailsMap[sub.id] = sub;
            });

            // Fetch parent step details
            const parentStepIds = [...new Set(allSubSteps.map((s: any) => s.parent_step_id).filter(Boolean))] as string[];
            if (parentStepIds.length > 0) {
              const { data: parentSteps } = await supabase
                .from('task_steps')
                .select('id, title, task:daily_tasks(id, title)')
                .in('id', parentStepIds);

              if (parentSteps) {
                parentSteps.forEach((step: any) => {
                  parentStepMap[step.id] = step;
                });
              }
            }
          }
        }

        // Map sub-step assignments untuk lookup
        const subStepAssignmentsMap: Record<string, any> = {};
        subStepAssigns.forEach((a: any) => {
          subStepAssignmentsMap[a.task_steps_to_steps_id] = a;
        });

        // Fetch due dates for assigned sub-steps
        const subStepAssignmentIds = subStepAssigns.map((a: any) => a.id).filter(Boolean);
        if (subStepAssignmentIds.length > 0) {
          const { data: subStepDueDates } = await supabase
            .from('task_steps_assigned_duedate')
            .select('task_steps_to_steps_assigned_id, due_date, created_at')
            .in('task_steps_to_steps_assigned_id', subStepAssignmentIds)
            .order('created_at', { ascending: false });

          if (subStepDueDates) {
            subStepDueDates.forEach((row: any) => {
              if (row.task_steps_to_steps_assigned_id && !subStepDueDatesMap[row.task_steps_to_steps_assigned_id]) {
                subStepDueDatesMap[row.task_steps_to_steps_assigned_id] = row.due_date;
              }
            });
          }
        }

        // Fetch employee details (for both step and sub-step assignments)
        const allEmployeeIds = [
          ...new Set([
            ...stepMapped.map((r: any) => r.employee?.id).filter(Boolean),
            ...subStepAssigns.map((a: any) => a.employee_id).filter(Boolean)
          ])
        ] as string[];
        
        let employeeMap: Record<string, any> = {};
        if (allEmployeeIds.length > 0) {
          const { data: employees } = await supabase
            .from('employees')
            .select('id, full_name, email')
            .in('id', allEmployeeIds);

          if (employees) {
            employees.forEach((emp: any) => {
              employeeMap[emp.id] = emp;
            });
          }
        }

        if (allSubSteps.length > 0) {
          // Map ALL sub-steps (both assigned and unassigned)
          const subStepMapped: AssignmentRow[] = allSubSteps.map((subStep: any) => {
            const parentStep = parentStepMap[subStep.parent_step_id];
            const stepAssignment = stepAssignmentMap[subStep.parent_step_id];
            const assignment = subStepAssignmentsMap[subStep.id];
            const isAssigned = !!assignment;
            
            // Determine employee: assigned sub-step employee OR parent step employee
            const employee = isAssigned 
              ? employeeMap[assignment.employee_id] || null
              : stepAssignment?.employee || null;
            
            // Determine due_date:
            // 1. Sub-step due_date (if assigned and has due_date)
            // 2. Step due_date (if parent step has due_date) - FALLBACK
            // 3. null (if neither)
            let due_date: string | null = null;
            if (isAssigned && assignment.id && subStepDueDatesMap[assignment.id]) {
              due_date = subStepDueDatesMap[assignment.id];
            } else if (stepAssignment?.due_date) {
              due_date = stepAssignment.due_date; // Fallback to step due_date
            }

            return {
              id: assignment?.id || `unassigned-${subStep.id}`, // Unique ID for unassigned
              type: 'substep' as const,
              task_steps_to_steps_id: subStep.id,
              task_steps_to_steps_assigned_id: assignment?.id || null,
              assigned_at: assignment?.assigned_at || stepAssignment?.assigned_at || new Date().toISOString(),
              employee: employee,
              step: parentStep ? {
                id: parentStep.id,
                title: parentStep.title,
                updated_at: null,
                completed_at: null,
                is_completed: false,
                task: parentStep.task || null
              } : null,
              subStep: {
                id: subStep.id,
                title: subStep.title,
                parent_step_id: subStep.parent_step_id,
                is_completed: subStep.is_completed || false,
                completed_at: subStep.completed_at || null
              },
              due_date: due_date,
            };
          });

          // Filter: Only include sub-steps that have due_date (requirement)
          const subStepMappedWithDueDate = subStepMapped.filter((row) => row.due_date !== null);

          // Logic: Filter out step assignments if same employee has sub-step assignments for that step
          const stepEmployeeMap = new Map<string, Set<string>>();
          stepMapped.forEach((row) => {
            if (row.employee?.id && row.task_step_id) {
              if (!stepEmployeeMap.has(row.employee.id)) {
                stepEmployeeMap.set(row.employee.id, new Set());
              }
              stepEmployeeMap.get(row.employee.id)!.add(row.task_step_id);
            }
          });

          const subStepEmployeeMap = new Map<string, Set<string>>();
          subStepMappedWithDueDate.forEach((row) => {
            if (row.employee?.id && row.step?.id) {
              if (!subStepEmployeeMap.has(row.employee.id)) {
                subStepEmployeeMap.set(row.employee.id, new Set());
              }
              subStepEmployeeMap.get(row.employee.id)!.add(row.step.id);
            }
          });

          // Filter: Remove step assignments if same employee has sub-step for that step
          const filteredStepMapped = stepMapped.filter((row) => {
            if (!row.employee?.id || !row.task_step_id) return true;
            const hasSubStep = subStepEmployeeMap.get(row.employee.id)?.has(row.task_step_id);
            return !hasSubStep; // Only keep if no sub-step for same employee and step
          });

          // Combine: step assignments (filtered) + sub-step rows (all with due_date)
          const allMapped = [...filteredStepMapped, ...subStepMappedWithDueDate];
          setRows(allMapped);
          console.log(`✅ Loaded ${filteredStepMapped.length} step assignments and ${subStepMappedWithDueDate.length} sub-step rows (including unassigned)`);
          
          // Extract step IDs for next steps...
          var allStepIdsFromAssignments = [...new Set(allMapped.map((r: any) => r.step?.id).filter(Boolean))] as string[];
          var completedStepIds = [...new Set(
            allMapped
              .filter((r: any) => {
                if (r.type === 'substep' && r.subStep) {
                  return r.subStep.is_completed && r.subStep.id;
                }
                return r.step?.is_completed && r.step?.id;
              })
              .map((r: any) => r.type === 'substep' ? r.subStep?.id : r.step?.id)
              .filter(Boolean)
          )] as string[];
        } else {
          // No sub-steps, use step assignments only
          setRows(stepMapped);
          console.log(`✅ Loaded ${stepMapped.length} step assignments (no sub-steps)`);
          
          // Extract step IDs and completed step IDs from assignments (REUSE DATA)
          var allStepIdsFromAssignments = [...new Set(stepMapped.map((r: any) => r.step?.id).filter(Boolean))] as string[];
          var completedStepIds = [...new Set(
            stepMapped
              .filter((r: any) => r.step?.is_completed && r.step?.id)
              .map((r: any) => r.step.id)
          )] as string[];
        }

        // STEP 2: PARALLEL - Fetch task IDs, completion dates, and blockers in parallel
        const [taskIdsResult, completionHistoryResult, stepBlockersResult] = await Promise.all([
          // Get task IDs (needed for history and sub-steps)
          supabase
            .from('daily_tasks')
            .select('id')
            .eq('organization_id', organizationId),
          
          // Get completion dates (only if there are completed steps)
          completedStepIds.length > 0
            ? supabase
                .from('task_step_history')
                .select('task_step_id, created_at, new_value')
                .in('task_step_id', completedStepIds)
                .eq('action_type', 'status_change')
                .or('new_value.eq.completed,new_value.eq.COMPLETED')
                .order('created_at', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          
          // Get step blockers (use step IDs from assignments - REUSE DATA)
          allStepIdsFromAssignments.length > 0
            ? supabase
                .from('task_step_history')
                .select('*')
                .eq('action_type', 'blocker_added')
                .in('task_step_id', allStepIdsFromAssignments)
            : Promise.resolve({ data: [], error: null })
        ]);

        const taskIdList = (taskIdsResult.data || []).map(t => t.id);
        
        // Process completion dates
        let completionDateMap: Record<string, string> = {};
        if (completionHistoryResult.data) {
          completionHistoryResult.data.forEach((entry: any) => {
            if (entry.task_step_id && !completionDateMap[entry.task_step_id]) {
              completionDateMap[entry.task_step_id] = entry.created_at;
            }
          });
          console.log(`📅 Loaded completion dates for ${Object.keys(completionDateMap).length} steps`);
        }
        setCompletionDateMap(completionDateMap);

        // Process step blockers
        const unresolvedStepBlockers = (stepBlockersResult.data || []).filter(
          (b: any) => b.is_resolved === null || b.is_resolved === false
        );
        console.log(`📊 Step blockers: ${(stepBlockersResult.data || []).length} total, ${unresolvedStepBlockers.length} unresolved`);

        // STEP 3: PARALLEL - Fetch step IDs and sub-step IDs in parallel
        let stepIdList: string[] = [];
        let subStepIdList: string[] = [];
        let history: any[] = [];
        let unresolvedSubStepBlockers: any[] = [];

        if (taskIdList.length > 0) {
          const stepIdsResult = await supabase
            .from('task_steps')
            .select('id')
            .in('task_id', taskIdList);
          
          stepIdList = (stepIdsResult.data || []).map(s => s.id);
          console.log(`📋 Found ${taskIdList.length} tasks, ${stepIdList.length} steps in organization`);
          
          // Fetch sub-steps for all steps (we need complete data for history and blockers)
          if (stepIdList.length > 0) {
            const subStepsResult = await supabase
              .from('task_steps_to_steps')
              .select('id, parent_step_id')
              .in('parent_step_id', stepIdList);
            subStepIdList = (subStepsResult.data || []).map(s => s.id);
            console.log(`📋 Found ${subStepIdList.length} sub-steps in organization`);
          }

          // STEP 4: PARALLEL - Fetch sub-step blockers and history in parallel
          const [subStepBlockersResult, historyData] = await Promise.all([
            // Get sub-step blockers
            subStepIdList.length > 0
              ? supabase
                  .from('task_step_history')
                  .select('*')
                  .eq('action_type', 'blocker_added')
                  .in('task_steps_to_steps_id', subStepIdList)
              : Promise.resolve({ data: [], error: null }),
            
            // Fetch history for steps and sub-steps via optimized RPC
            fetchHistoryBatch(stepIdList, subStepIdList, 50)
          ]);

          // Process sub-step blockers
          if (subStepBlockersResult.data) {
            unresolvedSubStepBlockers = subStepBlockersResult.data.filter(
              (b: any) => b.is_resolved === null || b.is_resolved === false
            );
            console.log(`📊 Sub-step blockers: ${subStepBlockersResult.data.length} total, ${unresolvedSubStepBlockers.length} unresolved`);
          }

          // Process history
          history = historyData || [];
        }

        // Combine all blockers
        const rawBlockers = [...unresolvedStepBlockers, ...unresolvedSubStepBlockers];
        rawBlockers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log(`📊 Total unresolved blockers: ${rawBlockers.length}`);

        // STEP 5: Collect IDs for enrichment
        const blockerStepIds = [...new Set(rawBlockers.map((b: any) => b.task_step_id).filter(Boolean))];
        const blockerSubStepIds = [...new Set(rawBlockers.map((b: any) => b.task_steps_to_steps_id).filter(Boolean))];
        const historyStepIds = [...new Set(history.map((h: any) => h.task_step_id).filter(Boolean))];
        const historySubStepIds = [...new Set(history.map((h: any) => h.task_steps_to_steps_id).filter(Boolean))];
        
        const allStepIds = [...new Set([...blockerStepIds, ...historyStepIds])];
        const allSubStepIds = [...new Set([...blockerSubStepIds, ...historySubStepIds])];

        // STEP 6: PARALLEL - Fetch enrichment data (steps and sub-steps) in parallel
        const [enrichmentStepsResult, enrichmentSubStepsResult] = await Promise.all([
          allStepIds.length > 0
            ? supabase
                .from('task_steps')
                .select('id, title, task:daily_tasks(id, title)')
                .in('id', allStepIds)
            : Promise.resolve({ data: [], error: null }),
          
          allSubStepIds.length > 0
            ? supabase
                .from('task_steps_to_steps')
                .select('id, title, parent_step_id')
                .in('id', allSubStepIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        // Build maps
        const stepMap: Record<string, any> = {};
        const subStepMap: Record<string, any> = {};
        (enrichmentStepsResult.data || []).forEach((s: any) => { stepMap[s.id] = s; });
        (enrichmentSubStepsResult.data || []).forEach((s: any) => { subStepMap[s.id] = s; });
        console.log(`📋 Loaded ${Object.keys(stepMap).length} steps into stepMap`);
        console.log(`📋 Loaded ${Object.keys(subStepMap).length} sub-steps into subStepMap`);

        // Enrich blockers
        const enriched = rawBlockers.map((b: any) => {
          const step = b.task_step_id ? stepMap[b.task_step_id] : null;
          const sub = b.task_steps_to_steps_id ? subStepMap[b.task_steps_to_steps_id] : null;
          const parentStep = sub?.parent_step_id ? stepMap[sub.parent_step_id] : null;
          const task = (step || parentStep)?.task || null;
          return {
            ...b,
            taskTitle: task?.title || '-',
            stepTitle: (step || parentStep)?.title || '-',
            subStepTitle: sub?.title || null,
          };
        });
        console.log(`✅ Enriched ${enriched.length} blockers with task/step info`);
        setBlockers(enriched);

        // Build blocker count and map by step
        const countMap: Record<string, number> = {};
        const byStep: Record<string, any[]> = {};
        enriched.forEach((b: any) => {
          const parentStepId = b.task_step_id || (b.task_steps_to_steps_id ? subStepMap[b.task_steps_to_steps_id]?.parent_step_id : null);
          if (parentStepId) {
            countMap[parentStepId] = (countMap[parentStepId] || 0) + 1;
            (byStep[parentStepId] = byStep[parentStepId] || []).push(b);
          }
        });
        setBlockerCountByStep(countMap);
        setBlockersByStep(byStep);

        // Fetch assigned_at for steps in recent updates
        const stepIdsForAssignedAt = [...new Set(
          history
            .map((h: any) => h.task_step_id)
            .filter(Boolean)
        )] as string[];
        
        let assignedAtMap: Record<string, string> = {};
        if (stepIdsForAssignedAt.length > 0) {
          const { data: assignments } = await supabase
            .from('task_steps_assigned')
            .select('task_step_id, assigned_at')
            .in('task_step_id', stepIdsForAssignedAt)
            .order('assigned_at', { ascending: false });
          
          if (assignments) {
            assignments.forEach((a: any) => {
              if (!assignedAtMap[a.task_step_id]) {
                assignedAtMap[a.task_step_id] = a.assigned_at;
              }
            });
          }
        }

        // Enrich recent updates
        const recent = history.map((b: any) => {
          const step = b.task_step_id ? stepMap[b.task_step_id] : null;
          const sub = b.task_steps_to_steps_id ? subStepMap[b.task_steps_to_steps_id] : null;
          const parentStep = sub?.parent_step_id ? stepMap[sub.parent_step_id] : null;
          const task = (step || parentStep)?.task || null;
          const assignedAt = b.task_step_id ? assignedAtMap[b.task_step_id] || null : null;
          return {
            ...b,
            taskTitle: task?.title || '-',
            stepTitle: (step || parentStep)?.title || '-',
            subStepTitle: sub?.title || null,
            assignedAt: assignedAt,
          };
        });
        setRecentUpdates(recent);
      } finally {
        setLoading(false);
      }
    };
    load().finally(() => {
      if (isActive) {
        isLoadingOrgRef.current = false;
        inFlightOrgRef.current = null;
      }
    });

    return () => {
      isActive = false;
    };
  }, [organizationId]);

  const performance = useMemo<ComputedPerformanceRow[]>(() => {
    return rows.map((r) => {
      const due = r.due_date ? new Date(r.due_date) : null;
      
      // Determine completion status based on type
      let finishedAt: string | null = null;
      let isCompleted = false;
      
      if (r.type === 'substep') {
        // For sub-step, use sub-step completion
        isCompleted = !!r.subStep?.is_completed;
        finishedAt = r.subStep?.completed_at || null;
      } else {
        // For step, use step completion
        isCompleted = !!r.step?.is_completed;
        finishedAt = r.step?.completed_at || null;
      }
      
      const finished = finishedAt ? new Date(finishedAt) : null;
      let isOnTime: boolean | null = null;
      let lateDays: number | null = null;
      if (due && finished) {
        const dueEnd = new Date(due);
        dueEnd.setHours(23,59,59,999);
        if (finished.getTime() <= dueEnd.getTime()) {
          isOnTime = true;
          lateDays = 0;
        } else {
          isOnTime = false;
          const diffMs = finished.getTime() - dueEnd.getTime();
          lateDays = Math.ceil(diffMs / (24*60*60*1000));
        }
      }
      
      return {
        assignmentId: r.id,
        employeeId: r.employee?.id || null,
        employeeName: r.employee?.full_name || 'Unknown',
        stepId: r.step?.id || null,
        stepTitle: r.step?.title || '-',
        taskTitle: r.step?.task?.title || '-',
        assignedAt: r.assigned_at || null,
        dueDate: r.due_date,
        finishedAt: finishedAt,
        isCompleted: isCompleted,
        isOnTime,
        lateDays,
        subStepTitle: r.subStep?.title || null,
        subStepId: r.subStep?.id || null,
        type: r.type,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    let data = [...performance];
    // time filter (based on due_date from task_steps_assigned_duedate)
    if (filters.timePeriod !== 'all') {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      if (filters.timePeriod === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
      } else if (filters.timePeriod === 'yesterday') {
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
        end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23,59,59,999);
      } else if (filters.timePeriod === 'this_week') {
        // This week: Monday to Sunday (not Sunday to Saturday)
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        // Calculate days to Monday (1 = Monday)
        const daysToMonday = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days to Monday
        start = new Date(now);
        start.setDate(now.getDate() - daysToMonday);
        start.setHours(0, 0, 0, 0);
        // End is Sunday (6 days after Monday)
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (filters.timePeriod === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (filters.timePeriod === 'last_month') {
        start = new Date(now.getFullYear(), now.getMonth()-1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999);
      } else if (filters.timePeriod === 'custom' && filters.customStart && filters.customEnd) {
        start = new Date(filters.customStart);
        end = new Date(filters.customEnd);
        end.setHours(23,59,59,999);
      }
      if (start) {
        data = data.filter(d => {
          // Filter by due_date from task_steps_assigned_duedate (primary source)
          // Only show items with due_date (requirement: sub-steps must have due_date)
          if (!d.dueDate) return false;
          
          try {
            const dueDate = new Date(d.dueDate);
            if (isNaN(dueDate.getTime())) return false; // Invalid date
            
            const ts = dueDate.getTime();
            const afterStart = ts >= start!.getTime();
            const beforeEnd = end ? ts <= end.getTime() : true;
            return afterStart && beforeEnd;
          } catch (error) {
            console.warn('Invalid due_date format:', d.dueDate);
            return false;
          }
        });
      }
    }
    if (filters.status !== 'all') {
      data = data.filter(d => (filters.status === 'ontime' ? d.isOnTime === true : d.isOnTime === false));
    }
    if (filters.pic && filters.pic !== 'all') {
      const q = filters.pic.toLowerCase();
      data = data.filter(d => d.employeeName.toLowerCase().includes(q));
    }
    if (filters.task && filters.task !== 'all') {
      const q = filters.task.toLowerCase();
      data = data.filter(d => d.taskTitle.toLowerCase().includes(q));
    }
    if (filters.step && filters.step !== 'all') {
      const q = filters.step.toLowerCase();
      data = data.filter(d => d.stepTitle.toLowerCase().includes(q));
    }
    if (filters.subStep && filters.subStep !== 'all') {
      const q = filters.subStep.toLowerCase();
      data = data.filter(d => (d.subStepTitle || '').toLowerCase().includes(q));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(d => 
        d.employeeName.toLowerCase().includes(q) || 
        d.taskTitle.toLowerCase().includes(q) || 
        d.stepTitle.toLowerCase().includes(q) ||
        (d.subStepTitle || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [performance, filters]);

  // Helper to compute date range from filters
  const getDateRange = () => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (filters.timePeriod === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    } else if (filters.timePeriod === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23,59,59,999);
    } else if (filters.timePeriod === 'this_week') {
      // This week: Monday to Sunday (not Sunday to Saturday)
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Calculate days to Monday (1 = Monday)
      const daysToMonday = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days to Monday
      start = new Date(now);
      start.setDate(now.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);
      // End is Sunday (6 days after Monday)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (filters.timePeriod === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filters.timePeriod === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth()-1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999);
    } else if (filters.timePeriod === 'custom' && filters.customStart && filters.customEnd) {
      start = new Date(filters.customStart);
      end = new Date(filters.customEnd);
      end.setHours(23,59,59,999);
    }
    return { start, end };
  };

  const filteredBlockers = useMemo(() => {
    const { start, end } = getDateRange();
    let list = [...blockers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(b => (
        (b.taskTitle || '').toLowerCase().includes(q) ||
        (b.stepTitle || '').toLowerCase().includes(q) ||
        (b.subStepTitle || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
      ));
    }
    if (filters.pic && filters.pic !== 'all') {
      const q = filters.pic.toLowerCase();
      list = list.filter(b => (b.created_by_employee?.full_name || '').toLowerCase().includes(q));
    }
    if (filters.task && filters.task !== 'all') {
      const q = filters.task.toLowerCase();
      list = list.filter(b => (b.taskTitle || '').toLowerCase().includes(q));
    }
    if (filters.step && filters.step !== 'all') {
      const q = filters.step.toLowerCase();
      list = list.filter(b => (b.stepTitle || '').toLowerCase().includes(q));
    }
    if (filters.subStep && filters.subStep !== 'all') {
      const q = filters.subStep.toLowerCase();
      list = list.filter(b => (b.subStepTitle || '').toLowerCase().includes(q));
    }
    if (filters.timePeriod !== 'all' && start) {
      list = list.filter(b => {
        const ts = new Date(b.created_at).getTime();
        const afterStart = ts >= start!.getTime();
        const beforeEnd = end ? ts <= end.getTime() : true;
        return afterStart && beforeEnd;
      });
    }
    return list;
  }, [blockers, filters]);

  const filteredRecentUpdates = useMemo(() => {
    const { start, end } = getDateRange();
    let list = [...recentUpdates];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(u => (
        (u.taskTitle || '').toLowerCase().includes(q) ||
        (u.stepTitle || '').toLowerCase().includes(q) ||
        (u.subStepTitle || '').toLowerCase().includes(q) ||
        (u.description || '').toLowerCase().includes(q)
      ));
    }
    if (filters.pic && filters.pic !== 'all') {
      const q = filters.pic.toLowerCase();
      list = list.filter(u => (u.created_by_employee?.full_name || '').toLowerCase().includes(q));
    }
    if (filters.task && filters.task !== 'all') {
      const q = filters.task.toLowerCase();
      list = list.filter(u => (u.taskTitle || '').toLowerCase().includes(q));
    }
    if (filters.step && filters.step !== 'all') {
      const q = filters.step.toLowerCase();
      list = list.filter(u => (u.stepTitle || '').toLowerCase().includes(q));
    }
    if (filters.subStep && filters.subStep !== 'all') {
      const q = filters.subStep.toLowerCase();
      list = list.filter(u => (u.subStepTitle || '').toLowerCase().includes(q));
    }
    if (filters.timePeriod !== 'all' && start) {
      list = list.filter(u => {
        const ts = new Date(u.created_at).getTime();
        const afterStart = ts >= start!.getTime();
        const beforeEnd = end ? ts <= end.getTime() : true;
        return afterStart && beforeEnd;
      });
    }
    return list;
  }, [recentUpdates, filters]);

  const updateFilter = (key: 'search' | 'status' | 'timePeriod' | 'customStart' | 'customEnd' | 'pic' | 'task' | 'step' | 'subStep', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value as any }));
  };

  // Helper function to format date range for display
  // Format: "15 Jan - 21 Jan 2025"
  const formatDateRangeDisplay = (): string => {
    if (filters.timePeriod === 'all') return '';
    
    const { start, end } = getDateRange();
    if (!start) return '';
    
    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };
    
    if (filters.timePeriod === 'today' || filters.timePeriod === 'yesterday') {
      return formatDate(start);
    }
    
    if (end) {
      const startFormatted = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const endFormatted = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startFormatted} - ${endFormatted}`;
    }
    
    return formatDate(start);
  };

  const value: ReportContextType = { loading, performance: performance.map(p => ({ ...p, })), filtered: filtered.map(p => ({ ...p, })), blockers, recentUpdates, filteredBlockers, filteredRecentUpdates, filters, updateFilter, getBlockersForStep: (stepId: string) => blockersByStep[stepId] || [], formatDateRangeDisplay };
  // Build dependent dropdown options from current dataset
  const base = [...performance];
  const pics = Array.from(new Set(base.map(p => p.employeeName).filter(Boolean))).sort();
  // Task options independent
  const tasks = Array.from(new Set(base.map(p => p.taskTitle).filter(Boolean))).sort();
  // Step depends on selected task (if not 'all')
  const steps = Array.from(new Set(
    base
      .filter(p => (filters.task && filters.task !== 'all') ? p.taskTitle === filters.task : true)
      .map(p => p.stepTitle)
      .filter(Boolean)
  )).sort();
  // Sub-step depends on selected task and step
  const subSteps = Array.from(new Set(
    base
      .filter(p => (filters.task && filters.task !== 'all') ? p.taskTitle === filters.task : true)
      .filter(p => (filters.step && filters.step !== 'all') ? p.stepTitle === filters.step : true)
      .map(p => p.subStepTitle || '')
      .filter(Boolean)
  )).sort();
  (value as any).options = { pics, tasks, steps, subSteps };
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};


