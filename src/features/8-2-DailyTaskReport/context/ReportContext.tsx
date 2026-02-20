import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { logger } from '@/config/logger';
import { getCached, setCache, clearCache } from '@/features/8-2-DailyTask/utils/optimizationUtils';
import { fetchCompletionDates, fetchStepBlockers } from '../utils/batchQueryProcessor';
import { filterPerformanceData, filterBySearchAndFilters, getDateRangeFromFilter } from '../utils/filterUtils';

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
  refreshError: string | null;
  retryRefresh: () => void;
  refreshReport: () => Promise<void>;
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
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
            logger.query(
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
          logger.warn('Optimized API error, falling back to old API', error.message);
        }
      } catch (err: any) {
        // Non-critical error, fall back to old API
        if (import.meta.env.DEV) {
          logger.warn('Optimized API failed, falling back to old API', err?.message || err);
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
      logger.error('Failed to fetch task_step_history batch', error);
      throw error;
    }

    if (import.meta.env.DEV) {
      logger.query(
        '📚 History batch fetch (legacy)',
        `steps=${stepIds.length} subSteps=${subStepIds.length} returned=${data?.length || 0}`
      );
    }

    return data || [];
    } catch (error) {
      logger.error('History fetch failed with both APIs', error);
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
              logger.error('Batch fetch error', error);
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
      logger.query(
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
      return;
    }

    isLoadingOrgRef.current = true;
    inFlightOrgRef.current = organizationId;
    let isActive = true;

    const load = async () => {
      setRefreshError(null);
      setLoading(true);
      
      try {
        // Try to load cached data first for instant display
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cacheKey = `report_${organizationId}_${user.id}`;
          const cached = getCached<{ rows: AssignmentRow[]; blockers: any[]; recentUpdates: any[] }>(cacheKey, 60000);
          if (cached !== undefined && cached !== null) {
            // Show cached data immediately
            if (!isActive) return;
            setRows(cached.rows || []);
            setBlockers(cached.blockers || []);
            setRecentUpdates(cached.recentUpdates || []);
            setLoading(false);
            
            // Fetch fresh data in background (non-blocking)
            // Continue with normal load but don't block UI
            loadFreshData().catch(err => {
              logger.warn('Background refresh failed', err);
              if (isActive) setRefreshError(err?.message || 'Background refresh failed');
            });
            return;
          }
        }
      } catch (cacheError) {
        // If cache check fails, continue with normal fetch
        logger.warn('Cache check failed, proceeding with normal fetch', cacheError);
      }
      
      // No cache available - fetch data normally
      await loadFreshData();
    };
    loadRef.current = load;
    
    const loadFreshData = async () => {
      let finalRows: AssignmentRow[] = [];
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
            .eq('organization_id', organizationId)
            .limit(1000), // Limit to prevent statement timeout
          
          // NEW: Fetch sub-step assignments (simple query, no deep joins to avoid timeout)
          supabase
            .from('task_steps_to_steps_assigned')
            .select('id, task_steps_to_steps_id, assigned_at, employee_id, organization_id')
            .eq('organization_id', organizationId)
            .limit(1000) // Limit to prevent statement timeout
        ]);

        if (stepAssignsResult.error) {
          logger.error('Error fetching step assignments', stepAssignsResult.error);
          throw stepAssignsResult.error;
        }

        if (subStepAssignsResult.error) {
          logger.error('Error fetching sub-step assignments', subStepAssignsResult.error);
          // Don't throw - continue with step assignments only
          logger.warn('Continuing without sub-step assignments');
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
            .in('parent_step_id', assignedStepIds)
            .limit(2000); // Limit to prevent statement timeout

          allSubSteps = allSubStepsData || [];
          logger.query(`📋 Found ${allSubSteps.length} total sub-steps for ${assignedStepIds.length} assigned steps`);

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
                .in('id', parentStepIds)
                .limit(1000); // Limit to prevent statement timeout

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
            .order('created_at', { ascending: false })
            .limit(1000); // Limit to prevent statement timeout

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
          finalRows = allMapped;
          if (!isActive) return;
          setRows(allMapped);
          logger.query(`✅ Loaded ${filteredStepMapped.length} step assignments and ${subStepMappedWithDueDate.length} sub-step rows (including unassigned)`);
          
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
          finalRows = stepMapped;
          if (!isActive) return;
          setRows(stepMapped);
          logger.query(`✅ Loaded ${stepMapped.length} step assignments (no sub-steps)`);
          
          // Extract step IDs and completed step IDs from assignments (REUSE DATA)
          var allStepIdsFromAssignments = [...new Set(stepMapped.map((r: any) => r.step?.id).filter(Boolean))] as string[];
          var completedStepIds = [...new Set(
            stepMapped
              .filter((r: any) => r.step?.is_completed && r.step?.id)
              .map((r: any) => r.step.id)
          )] as string[];
        }

        // STEP 2: OPTIMIZED - Fetch only task IDs first (critical), move completion dates and blockers to background
        const taskIdsResult = await supabase
          .from('daily_tasks')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(1000); // Limit to prevent statement timeout

        const taskIdList = (taskIdsResult.data || []).map(t => t.id);
        
        // Initialize empty maps (will be updated in background)
        let completionDateMap: Record<string, string> = {};
        if (!isActive) return;
        setCompletionDateMap(completionDateMap);
        let unresolvedStepBlockers: any[] = [];
        
        // Load completion dates and blockers in background (non-blocking)
        // These are non-critical for initial page display
        if (completedStepIds.length > 0 || allStepIdsFromAssignments.length > 0) {
          (async () => {
            try {
              // Fetch completion dates in background using utility
              if (completedStepIds.length > 0) {
                fetchCompletionDates(completedStepIds)
                  .then(completionDateMap => {
                    if (!isActive) return;
                    startTransition(() => setCompletionDateMap(completionDateMap));
                    logger.query(`📅 Loaded completion dates in background: ${Object.keys(completionDateMap).length} steps`);
                  })
                  .catch(err => {
                    if (err?.status !== 500) {
                      logger.warn('Error loading completion dates (non-critical)', err);
                    }
                  });
              }
              
              // DISABLED: Step blockers query - causes 500 errors
              // Query disabled due to database performance issues
              if (false && allStepIdsFromAssignments.length > 0) {
                const BLOCKER_BATCH_SIZE = 5; // Much smaller batch size to avoid timeout
                const batches: string[][] = [];
                for (let i = 0; i < allStepIdsFromAssignments.length; i += BLOCKER_BATCH_SIZE) {
                  batches.push(allStepIdsFromAssignments.slice(i, i + BLOCKER_BATCH_SIZE));
                }
                
                const allBlockers: any[] = [];
                for (const batch of batches) {
                  try {
                    const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Blockers query timeout')), 8000)
                    );
                    
                    // DISABLED: Query causes 500 errors
                    // const queryPromise = supabase
                    //   .from('task_step_history')
                    //   .select('*')
                    //   .eq('action_type', 'blocker_added')
                    //   .in('task_step_id', batch);
                    const queryPromise = Promise.resolve({ data: null, error: null });
                    
                    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
                    
                    if (result.data) {
                      allBlockers.push(...result.data);
                    }
                    } catch (err: any) {
                      // Skip on timeout/error (non-critical)
                      if (!err?.message?.includes('timeout')) {
                        logger.warn('Error fetching step blockers batch (non-critical)', err);
                      }
                    }
                  
                  // Small delay between batches to avoid overwhelming database
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                const newUnresolvedStepBlockers = allBlockers.filter(
                  (b: any) => b.is_resolved === null || b.is_resolved === false
                );
                
                // Enrich step blockers before updating state
                const blockerStepIds = [...new Set(newUnresolvedStepBlockers.map((b: any) => b.task_step_id).filter(Boolean))];
                
                if (blockerStepIds.length > 0) {
                  try {
                    const { data: stepsData } = await supabase
                      .from('task_steps')
                      .select('id, title, task:daily_tasks(id, title)')
                      .in('id', blockerStepIds)
                      .limit(1000); // Limit to prevent statement timeout
                    
                    const stepMap: Record<string, any> = {};
                    (stepsData || []).forEach((s: any) => { stepMap[s.id] = s; });
                    
                    const enriched = newUnresolvedStepBlockers.map((b: any) => {
                      const step = b.task_step_id ? stepMap[b.task_step_id] : null;
                      const task = step?.task || null;
                      return {
                        ...b,
                        taskTitle: task?.title || '-',
                        stepTitle: step?.title || '-',
                        subStepTitle: null,
                      };
                    });
                    
                    // Update blockers in state with enriched data
                    if (!isActive) return;
                    setBlockers(prevBlockers => {
                      const combined = [...enriched, ...prevBlockers];
                      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      return combined;
                    });
                    
                    // Update blocker counts
                    const countMap: Record<string, number> = {};
                    const byStep: Record<string, any[]> = {};
                    enriched.forEach((b: any) => {
                      const parentStepId = b.task_step_id;
                      if (parentStepId) {
                        countMap[parentStepId] = (countMap[parentStepId] || 0) + 1;
                        (byStep[parentStepId] = byStep[parentStepId] || []).push(b);
                      }
                    });
                    setBlockerCountByStep(prev => ({ ...prev, ...countMap }));
                    setBlockersByStep(prev => ({ ...prev, ...byStep }));
                  } catch (enrichErr) {
                    logger.warn('Error enriching step blockers (non-critical)', enrichErr);
                    // Still update with unenriched data
                    if (!isActive) return;
                    setBlockers(prevBlockers => {
                      const combined = [...newUnresolvedStepBlockers, ...prevBlockers];
                      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      return combined;
                    });
                  }
                } else {
                  // No blockers to enrich, just update state
                  if (!isActive) return;
                  setBlockers(prevBlockers => {
                    const combined = [...newUnresolvedStepBlockers, ...prevBlockers];
                    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    return combined;
                  });
                }
                
                logger.query(`📊 Step blockers loaded in background: ${allBlockers.length} total, ${newUnresolvedStepBlockers.length} unresolved`);
              }
            } catch (error) {
              logger.warn('Error loading completion dates/blockers in background (non-critical)', error);
            }
          })().catch(err => logger.warn('Background completion/blockers fetch failed', err));
        }

        // STEP 3: PARALLEL - Fetch step IDs and sub-step IDs in parallel
        let stepIdList: string[] = [];
        let subStepIdList: string[] = [];
        let history: any[] = [];
        let unresolvedSubStepBlockers: any[] = [];

        if (taskIdList.length > 0) {
          const stepIdsResult = await supabase
            .from('task_steps')
            .select('id')
            .in('task_id', taskIdList)
            .limit(5000); // Limit to prevent statement timeout
          
          stepIdList = (stepIdsResult.data || []).map(s => s.id);
          logger.query(`📋 Found ${taskIdList.length} tasks, ${stepIdList.length} steps in organization`);
          
          // Fetch sub-steps for all steps (we need complete data for history and blockers)
          if (stepIdList.length > 0) {
            const subStepsResult = await supabase
              .from('task_steps_to_steps')
              .select('id, parent_step_id')
              .in('parent_step_id', stepIdList)
              .limit(5000); // Limit to prevent statement timeout
            subStepIdList = (subStepsResult.data || []).map(s => s.id);
            logger.query(`📋 Found ${subStepIdList.length} sub-steps in organization`);
          }

          // STEP 4: OPTIMIZED - Load sub-step blockers and history in background (non-blocking)
          // Initialize empty arrays (will be updated in background)
          let unresolvedSubStepBlockers: any[] = [];
          let history: any[] = [];
          
          // Load sub-step blockers and history in background
          if (subStepIdList.length > 0 || stepIdList.length > 0) {
            (async () => {
              try {
                // DISABLED: Sub-step blockers query - causes 500 errors
                // Query disabled due to database performance issues
                if (false && subStepIdList.length > 0) {
                  const BLOCKER_BATCH_SIZE = 5; // Much smaller batch size
                  const batches: string[][] = [];
                  for (let i = 0; i < subStepIdList.length; i += BLOCKER_BATCH_SIZE) {
                    batches.push(subStepIdList.slice(i, i + BLOCKER_BATCH_SIZE));
                  }
                  
                  const allBlockers: any[] = [];
                  for (const batch of batches) {
                    try {
                      const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Sub-step blockers query timeout')), 8000)
                      );
                      
                      // DISABLED: Query causes 500 errors
                      // const queryPromise = supabase
                      //   .from('task_step_history')
                      //   .select('*')
                      //   .eq('action_type', 'blocker_added')
                      //   .in('task_steps_to_steps_id', batch);
                      const queryPromise = Promise.resolve({ data: null, error: null });
                      
                      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
                      
                      if (result.data) {
                        allBlockers.push(...result.data);
                      }
                    } catch (err: any) {
                      // Skip on timeout/error (non-critical)
                      if (!err?.message?.includes('timeout')) {
                        logger.warn('Error fetching sub-step blockers batch (non-critical)', err);
                      }
                    }
                    
                    // Small delay between batches
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                  
                  const newUnresolvedSubStepBlockers = allBlockers.filter(
                    (b: any) => b.is_resolved === null || b.is_resolved === false
                  );
                  
                  // Enrich sub-step blockers before updating state
                  const blockerSubStepIds = [...new Set(newUnresolvedSubStepBlockers.map((b: any) => b.task_steps_to_steps_id).filter(Boolean))];
                  
                  if (blockerSubStepIds.length > 0) {
                    try {
                      const { data: subStepsData } = await supabase
                        .from('task_steps_to_steps')
                        .select('id, title, parent_step_id')
                        .in('id', blockerSubStepIds)
                        .limit(1000); // Limit to prevent statement timeout
                      
                      const subStepMap: Record<string, any> = {};
                      (subStepsData || []).forEach((s: any) => { subStepMap[s.id] = s; });
                      
                      const parentStepIds = [...new Set((subStepsData || []).map((s: any) => s.parent_step_id).filter(Boolean))];
                      const { data: stepsData } = await supabase
                        .from('task_steps')
                        .select('id, title, task:daily_tasks(id, title)')
                        .in('id', parentStepIds)
                        .limit(1000); // Limit to prevent statement timeout
                      
                      const stepMap: Record<string, any> = {};
                      (stepsData || []).forEach((s: any) => { stepMap[s.id] = s; });
                      
                      const enriched = newUnresolvedSubStepBlockers.map((b: any) => {
                        const sub = b.task_steps_to_steps_id ? subStepMap[b.task_steps_to_steps_id] : null;
                        const parentStep = sub?.parent_step_id ? stepMap[sub.parent_step_id] : null;
                        const task = parentStep?.task || null;
                        return {
                          ...b,
                          taskTitle: task?.title || '-',
                          stepTitle: parentStep?.title || '-',
                          subStepTitle: sub?.title || null,
                        };
                      });
                      
                      // Update blockers in state with enriched data
                      if (!isActive) return;
                      setBlockers(prevBlockers => {
                        const combined = [...enriched, ...prevBlockers];
                        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        return combined;
                      });
                      
                      // Update blocker counts
                      const countMap: Record<string, number> = {};
                      const byStep: Record<string, any[]> = {};
                      enriched.forEach((b: any) => {
                        const parentStepId = b.task_steps_to_steps_id ? subStepMap[b.task_steps_to_steps_id]?.parent_step_id : b.task_step_id;
                        if (parentStepId) {
                          countMap[parentStepId] = (countMap[parentStepId] || 0) + 1;
                          (byStep[parentStepId] = byStep[parentStepId] || []).push(b);
                        }
                      });
                      setBlockerCountByStep(prev => ({ ...prev, ...countMap }));
                      setBlockersByStep(prev => ({ ...prev, ...byStep }));
                    } catch (enrichErr) {
                      logger.warn('Error enriching sub-step blockers (non-critical)', enrichErr);
                      // Still update with unenriched data
                      if (!isActive) return;
                      setBlockers(prevBlockers => {
                        const combined = [...newUnresolvedSubStepBlockers, ...prevBlockers];
                        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        return combined;
                      });
                    }
                  } else {
                    // No blockers to enrich, just update state
                    if (!isActive) return;
                    setBlockers(prevBlockers => {
                      const combined = [...newUnresolvedSubStepBlockers, ...prevBlockers];
                      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      return combined;
                    });
                  }
                  
                  logger.query(`📊 Sub-step blockers loaded in background: ${allBlockers.length} total, ${newUnresolvedSubStepBlockers.length} unresolved`);
                }
                
                // Fetch history in background (non-blocking)
                if (stepIdList.length > 0 || subStepIdList.length > 0) {
                  try {
                    const historyData = await fetchHistoryBatch(stepIdList, subStepIdList, 50);
                    
                    // Enrich history before updating state
                    if (historyData && historyData.length > 0) {
                      const historyStepIds = [...new Set(historyData.map((h: any) => h.task_step_id).filter(Boolean))];
                      const historySubStepIds = [...new Set(historyData.map((h: any) => h.task_steps_to_steps_id).filter(Boolean))];
                      
                      const [stepsResult, subStepsResult, assignmentsResult] = await Promise.all([
                        historyStepIds.length > 0
                          ? supabase
                              .from('task_steps')
                              .select('id, title, task:daily_tasks(id, title)')
                              .in('id', historyStepIds)
                              .limit(1000) // Limit to prevent statement timeout
                          : Promise.resolve({ data: [], error: null }),
                        historySubStepIds.length > 0
                          ? supabase
                              .from('task_steps_to_steps')
                              .select('id, title, parent_step_id')
                              .in('id', historySubStepIds)
                              .limit(1000) // Limit to prevent statement timeout
                          : Promise.resolve({ data: [], error: null }),
                        historyStepIds.length > 0
                          ? supabase
                              .from('task_steps_assigned')
                              .select('task_step_id, assigned_at')
                              .in('task_step_id', historyStepIds)
                              .order('assigned_at', { ascending: false })
                              .limit(1000) // Limit to prevent statement timeout
                          : Promise.resolve({ data: [], error: null })
                      ]);
                      
                      const stepMap: Record<string, any> = {};
                      const subStepMap: Record<string, any> = {};
                      const assignedAtMap: Record<string, string> = {};
                      
                      (stepsResult.data || []).forEach((s: any) => { stepMap[s.id] = s; });
                      (subStepsResult.data || []).forEach((s: any) => { subStepMap[s.id] = s; });
                      (assignmentsResult.data || []).forEach((a: any) => {
                        if (!assignedAtMap[a.task_step_id]) {
                          assignedAtMap[a.task_step_id] = a.assigned_at;
                        }
                      });
                      
                      const enriched = historyData.map((b: any) => {
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
                      
                      // Update recent updates in state with enriched data (startTransition to reduce render churn)
                      if (!isActive) return;
                      startTransition(() => {
                        setRecentUpdates(prevUpdates => {
                          const combined = [...enriched, ...prevUpdates];
                          combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                          return combined;
                        });
                      });
                      
                      logger.query(`📚 History loaded and enriched in background: ${enriched.length} items`);
                    } else {
                      logger.query(`📚 History loaded in background: 0 items`);
                    }
                  } catch (err) {
                    logger.warn('Error fetching history in background (non-critical)', err);
                    if (!isActive) return;
                    startTransition(() => setRecentUpdates([]));
                  }
                }
              } catch (error) {
                logger.warn('Error loading sub-step blockers/history in background (non-critical)', error);
              }
            })().catch(err => logger.warn('Background sub-step blockers/history fetch failed', err));
          }
        }

        // STEP 5: OPTIMIZED - Enrichment will be done in background after blockers/history are loaded
        // For now, set empty blockers (will be updated in background)
        if (!isActive) return;
        setBlockers([]);
        setBlockerCountByStep({});
        setBlockersByStep({});

        // Recent updates will be enriched in background after history is loaded
        setRecentUpdates([]);
        
        // Save to cache for fast subsequent loads (without blockers/history for now)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const cacheKey = `report_${organizationId}_${user.id}`;
            setCache(cacheKey, {
              rows: finalRows,
              blockers: [],
              recentUpdates: []
            });
          }
        } catch (cacheError) {
          logger.warn('Failed to save cache', cacheError);
        }
      } finally {
        if (isActive) setLoading(false);
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
    return filterPerformanceData(performance, filters);
  }, [performance, filters]);

  // Helper to compute date range from filters
  const getDateRange = () => {
    return getDateRangeFromFilter(filters);
  };

  const filteredBlockers = useMemo(() => {
    return filterBySearchAndFilters(blockers, filters);
  }, [blockers, filters]);

  const filteredRecentUpdates = useMemo(() => {
    return filterBySearchAndFilters(recentUpdates, filters);
  }, [recentUpdates, filters]);

  const updateFilter = useCallback((key: 'search' | 'status' | 'timePeriod' | 'customStart' | 'customEnd' | 'pic' | 'task' | 'step' | 'subStep', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value as any }));
  }, []);

  // Helper function to format date range for display
  // Format: "15 Jan - 21 Jan 2025"
  const formatDateRangeDisplay = useCallback((): string => {
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
  }, [filters]);

  const retryRefresh = useCallback(() => {
    setRefreshError(null);
    void loadRef.current?.();
  }, []);
  const refreshReport = useCallback(async () => {
    setRefreshError(null);
    await loadRef.current?.();
  }, []);

  const getBlockersForStep = useCallback((stepId: string) => blockersByStep[stepId] || [], [blockersByStep]);

  // Build dependent dropdown options from current dataset (memoized to avoid new refs every render)
  const options = useMemo(() => {
    const base = [...performance];
    const pics = Array.from(new Set(base.map(p => p.employeeName).filter(Boolean))).sort();
    const tasks = Array.from(new Set(base.map(p => p.taskTitle).filter(Boolean))).sort();
    const steps = Array.from(new Set(
      base
        .filter(p => (filters.task && filters.task !== 'all') ? p.taskTitle === filters.task : true)
        .map(p => p.stepTitle)
        .filter(Boolean)
    )).sort();
    const subSteps = Array.from(new Set(
      base
        .filter(p => (filters.task && filters.task !== 'all') ? p.taskTitle === filters.task : true)
        .filter(p => (filters.step && filters.step !== 'all') ? p.stepTitle === filters.step : true)
        .map(p => p.subStepTitle || '')
        .filter(Boolean)
    )).sort();
    return { pics, tasks, steps, subSteps };
  }, [performance, filters.task, filters.step]);

  const value = useMemo<ReportContextType>(() => ({
    loading,
    performance,
    filtered,
    blockers,
    recentUpdates,
    filteredBlockers,
    filteredRecentUpdates,
    filters,
    updateFilter,
    getBlockersForStep,
    formatDateRangeDisplay,
    refreshError,
    retryRefresh,
    refreshReport,
    options,
  }), [
    loading,
    performance,
    filtered,
    blockers,
    recentUpdates,
    filteredBlockers,
    filteredRecentUpdates,
    filters,
    updateFilter,
    getBlockersForStep,
    formatDateRangeDisplay,
    refreshError,
    retryRefresh,
    refreshReport,
    options,
  ]);

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};


