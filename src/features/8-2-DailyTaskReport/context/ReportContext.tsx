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

  useEffect(() => {
    const load = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
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

        // recent history (timeline)
        const { data: history } = await supabase
          .from('task_step_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        const hist = history || [];

        // Collect IDs for enrichment (both for blockers and updates)
        const rawBlockers = hist.filter((h: any) => h.action_type?.startsWith('blocker'));
        const stepIds = [...new Set(rawBlockers.map((b: any) => b.task_step_id).filter(Boolean))];
        const subStepIds = [...new Set(rawBlockers.map((b: any) => b.task_steps_to_steps_id).filter(Boolean))];
        // Also include from general history
        hist.forEach((h: any) => {
          if (h.task_step_id) stepIds.push(h.task_step_id);
          if (h.task_steps_to_steps_id) subStepIds.push(h.task_steps_to_steps_id);
        });
        const uniqStepIds = [...new Set(stepIds)];
        const uniqSubIds = [...new Set(subStepIds)];

        let stepMap: Record<string, any> = {};
        let subStepMap: Record<string, any> = {};

        if (uniqStepIds.length > 0) {
          const { data: steps } = await supabase
            .from('task_steps' as any)
            .select('id, title, task:daily_tasks(id, title)')
            .in('id', uniqStepIds);
          (steps || []).forEach((s: any) => { stepMap[s.id] = s; });
        }
        if (uniqSubIds.length > 0) {
          const { data: subs } = await supabase
            .from('task_steps_to_steps' as any)
            .select('id, title, parent_step_id')
            .in('id', uniqSubIds);
          (subs || []).forEach((s: any) => { subStepMap[s.id] = s; });
        }

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
        setBlockers(enriched);

        // Enrich recent updates similarly
        const recent = hist.map((b: any) => {
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
      const finished = r.step?.is_completed && r.step?.updated_at ? new Date(r.step.updated_at) : null;
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
        finishedAt: r.step?.updated_at || null,
        isCompleted: !!r.step?.is_completed,
        isOnTime,
        lateDays,
        subStepTitle: null,
      };
    });
  }, [rows]);

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

  const value: ReportContextType = { loading, performance, filtered, blockers, recentUpdates, filteredBlockers, filteredRecentUpdates, filters, updateFilter };
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


