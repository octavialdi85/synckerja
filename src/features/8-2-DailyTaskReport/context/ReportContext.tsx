import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface AssignmentRow {
  id: string;
  task_step_id: string;
  assigned_at: string;
  employee: { id: string; full_name: string; email?: string } | null;
  step: { id: string; title: string; updated_at: string | null; is_completed: boolean; task?: { id: string; title: string } } | null;
  due_date: string | null;
}

export interface ComputedPerformanceRow {
  assignmentId: string;
  employeeId: string | null;
  employeeName: string;
  stepId: string | null;
  stepTitle: string;
  taskTitle: string;
  dueDate: string | null;
  finishedAt: string | null;
  isCompleted: boolean;
  isOnTime: boolean | null;
  lateDays: number | null;
  subStepTitle?: string | null;
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
  }>({ search: '', status: 'all', timePeriod: 'all', customStart: null, customEnd: null, pic: 'all', task: 'all', step: 'all', subStep: 'all' });
  const [blockerCountByStep, setBlockerCountByStep] = useState<Record<string, number>>({});
  const [blockersByStep, setBlockersByStep] = useState<Record<string, any[]>>({});
  const [completionDateMap, setCompletionDateMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        // STEP 1: Fetch assignments (this is the main data source)
        const { data: assigns } = await supabase
          .from('task_steps_assigned')
          .select(`
            id, task_step_id, assigned_at,
            employee:employees!employee_id(id, full_name, email),
            step:task_steps(id, title, updated_at, is_completed, task:daily_tasks(id, title)),
            task_steps_assigned_duedate(due_date, created_at)
          `)
          .eq('organization_id', organizationId);

        const mapped: AssignmentRow[] = (assigns || []).map((a: any) => ({
          id: a.id,
          task_step_id: a.task_step_id,
          assigned_at: a.assigned_at,
          employee: a.employee || null,
          step: a.step || null,
          due_date: (a.task_steps_assigned_duedate || [])
            .sort((x: any,y: any)=> new Date(y.created_at).getTime()-new Date(x.created_at).getTime())[0]?.due_date || null,
        }));
        setRows(mapped);

        // Extract step IDs and completed step IDs from assignments (REUSE DATA)
        const allStepIdsFromAssignments = [...new Set(mapped.map((r: any) => r.step?.id).filter(Boolean))] as string[];
        const completedStepIds = [...new Set(
          mapped
            .filter((r: any) => r.step?.is_completed && r.step?.id)
            .map((r: any) => r.step.id)
        )] as string[];

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
          const [subStepBlockersResult, historyResult] = await Promise.all([
            // Get sub-step blockers
            subStepIdList.length > 0
              ? supabase
                  .from('task_step_history')
                  .select('*')
                  .eq('action_type', 'blocker_added')
                  .in('task_steps_to_steps_id', subStepIdList)
              : Promise.resolve({ data: [], error: null }),
            
            // Fetch history for steps and sub-steps
            (stepIdList.length > 0 || subStepIdList.length > 0)
              ? (() => {
                  let historyQuery = supabase.from('task_step_history').select('*');
                  if (stepIdList.length > 0 && subStepIdList.length > 0) {
                    historyQuery = historyQuery.or(
                      `task_step_id.in.(${stepIdList.join(',')}),task_steps_to_steps_id.in.(${subStepIdList.join(',')})`
                    );
                  } else if (stepIdList.length > 0) {
                    historyQuery = historyQuery.in('task_step_id', stepIdList);
                  } else if (subStepIdList.length > 0) {
                    historyQuery = historyQuery.in('task_steps_to_steps_id', subStepIdList);
                  }
                  return historyQuery.order('created_at', { ascending: false }).limit(50);
                })()
              : Promise.resolve({ data: [], error: null })
          ]);

          // Process sub-step blockers
          if (subStepBlockersResult.data) {
            unresolvedSubStepBlockers = subStepBlockersResult.data.filter(
              (b: any) => b.is_resolved === null || b.is_resolved === false
            );
            console.log(`📊 Sub-step blockers: ${subStepBlockersResult.data.length} total, ${unresolvedSubStepBlockers.length} unresolved`);
          }

          // Process history
          history = historyResult.data || [];
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

        // Enrich recent updates
        const recent = history.map((b: any) => {
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
        setRecentUpdates(recent);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organizationId]);

  const performance = useMemo<ComputedPerformanceRow[]>(() => {
    return rows.map((r) => {
      const due = r.due_date ? new Date(r.due_date) : null;
      
      // IMPORTANT: Use actual completion date from history, not updated_at
      // updated_at can change on any update, but completion date is when step was first marked completed
      let finishedAt: string | null = null;
      if (r.step?.is_completed && r.step?.id) {
        // First try to get from completion date map (from task_step_history)
        if (completionDateMap[r.step.id]) {
          finishedAt = completionDateMap[r.step.id];
        } else if (r.step?.updated_at) {
          // Fallback to updated_at if no history found (for backward compatibility)
          finishedAt = r.step.updated_at;
        }
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
        dueDate: r.due_date,
        finishedAt: finishedAt,
        isCompleted: !!r.step?.is_completed,
        isOnTime,
        lateDays,
        subStepTitle: null,
      };
    });
  }, [rows, completionDateMap]);

  const filtered = useMemo(() => {
    let data = [...performance];
    // time filter (basic client-side)
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
        start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      } else if (filters.timePeriod === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
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
          const ts = d.finishedAt ? new Date(d.finishedAt).getTime() : (d.dueDate ? new Date(d.dueDate).getTime() : 0);
          if (!ts) return false;
          const afterStart = ts >= start!.getTime();
          const beforeEnd = end ? ts <= end.getTime() : true;
          return afterStart && beforeEnd;
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
      data = data.filter(d => d.employeeName.toLowerCase().includes(q) || d.taskTitle.toLowerCase().includes(q) || d.stepTitle.toLowerCase().includes(q));
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
      start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
    } else if (filters.timePeriod === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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

  const value: ReportContextType = { loading, performance: performance.map(p => ({ ...p, })), filtered: filtered.map(p => ({ ...p, })), blockers, recentUpdates, filteredBlockers, filteredRecentUpdates, filters, updateFilter, getBlockersForStep: (stepId: string) => blockersByStep[stepId] || [] };
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


