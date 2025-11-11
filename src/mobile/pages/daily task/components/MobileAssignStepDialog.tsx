import React, { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  status?: string;
}

interface MobileAssignStepDialogProps {
  step: {
    id: string;
    title: string;
    assigned_to?: string | null;
    assigned_employee?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  onAssign: (employeeId: string, dueDateIso?: string | null) => void;
  onUnassign: () => void;
  onClose: () => void;
}

export const MobileAssignStepDialog = ({ step, onAssign, onUnassign, onClose }: MobileAssignStepDialogProps) => {
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('23:59'); // Default time 23:59
  const [savingDue, setSavingDue] = useState<boolean>(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // Track if initial load is done
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const { data: employees = [], isLoading: loading } = useAvailableEmployees();

  // Generate date options (today + next 30 days)
  const generateDateOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const value = `${yyyy}-${mm}-${dd}`;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Generate time options (00:00 to 23:59 with 15-minute intervals)
  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  // Load current assignment and due date (if any) - only once on mount
  useEffect(() => {
    if (isInitialized) return; // Prevent re-running after initialization
    
    const loadAssignmentAndDue = async () => {
      try {
        if (!organizationId || !step?.id) {
          setIsInitialized(true);
          return;
        }
        // latest assignment for this step
        const { data: assigns } = await supabase
          .from('task_steps_assigned')
          .select('id, assigned_at')
          .eq('task_step_id', step.id)
          .order('assigned_at', { ascending: false })
          .limit(1);
        const assign = (assigns || [])[0];
        if (assign) {
          setActiveAssignmentId(assign.id);
          const { data: dueRows } = await supabase
            .from('task_steps_assigned_duedate')
            .select('due_date')
            .eq('task_steps_assigned_id', assign.id)
            .order('created_at', { ascending: false })
            .limit(1);
          const due = (dueRows || [])[0]?.due_date as string | undefined;
          if (due) {
            const d = new Date(due);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setDueDate(`${yyyy}-${mm}-${dd}`);
            // Extract time from due date
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            setDueTime(`${hours}:${minutes}`);
          }
          // If no due date exists, keep default 23:59 (already set in initial state)
        } else {
          setActiveAssignmentId(null);
          // Keep default 23:59 when no assignment exists (already set in initial state)
        }
        setIsInitialized(true);
      } catch (e) {
        console.warn('Failed to load assignment/due date', e);
        setIsInitialized(true);
      }
    };
    loadAssignmentAndDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, organizationId, isInitialized]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const resolveDueDateIso = (): string | null => {
    if (!dueDate) return null;
    // Combine date and time
    const [hours, minutes] = dueTime.split(':');
    const dateTime = new Date(dueDate);
    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return dateTime.toISOString();
  };

  const handleAssign = (employeeId: string) => {
    onAssign(employeeId, resolveDueDateIso());
  };

  const handleUnassign = () => {
    onUnassign();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-none h-full max-h-screen m-0 rounded-none fixed inset-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:max-w-md sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-normal">
            <Users className="w-5 h-5" />
            <span className="lowercase">Assign Step: {step.title}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            Select an employee to assign this step to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {/* Current Assignment */}
          {step.assigned_to && step.assigned_employee ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Currently Assigned To:</p>
                  <p className="text-sm text-green-700">{step.assigned_employee.full_name}</p>
                  {step.assigned_employee.email && (
                    <p className="text-xs text-green-600">{step.assigned_employee.email}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassign}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Unassign
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">This step is not assigned to anyone yet.</p>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          {/* Due Date and Time (two dropdowns, autosave) */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Due date</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Date Dropdown */}
              <Select
                value={dueDate}
                onValueChange={async (val) => {
                  setDueDate(val);
                  // autosave only if an active assignment exists
                  if (!activeAssignmentId) return;
                  try {
                    setSavingDue(true);
                    // Combine date and time
                    const [hours, minutes] = dueTime.split(':');
                    const dateTime = new Date(val);
                    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    const iso = dateTime.toISOString();
                    await supabase
                      .from('task_steps_assigned_duedate')
                      .insert({
                        organization_id: organizationId,
                        task_steps_assigned_id: activeAssignmentId,
                        due_date: iso,
                      });
                  } catch (err) {
                    console.error('Autosave due date failed', err);
                    toast({ title: 'Error', description: 'Failed to save due date', variant: 'destructive' });
                  } finally {
                    setSavingDue(false);
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {generateDateOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Dropdown */}
              <Select
                value={dueTime || '23:59'}
                onValueChange={async (val) => {
                  setDueTime(val);
                  // autosave only if an active assignment exists
                  if (!activeAssignmentId || !dueDate) return;
                  try {
                    setSavingDue(true);
                    // Combine date and time
                    const [hours, minutes] = val.split(':');
                    const dateTime = new Date(dueDate);
                    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    const iso = dateTime.toISOString();
                    await supabase
                      .from('task_steps_assigned_duedate')
                      .insert({
                        organization_id: organizationId,
                        task_steps_assigned_id: activeAssignmentId,
                        due_date: iso,
                      });
                  } catch (err) {
                    console.error('Autosave due time failed', err);
                    toast({ title: 'Error', description: 'Failed to save due time', variant: 'destructive' });
                  } finally {
                    setSavingDue(false);
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue>{dueTime || '23:59'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {savingDue && <div className="text-[10px] text-gray-400">Saving…</div>}
          </div>

          {/* Employee List */}
          <div className="max-h-[calc(100vh-400px)] sm:max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading employees...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No employees found</p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    employee.id === step.assigned_to
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                  onClick={() => handleAssign(employee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{employee.full_name}</p>
                      {employee.email && (
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      )}
                    </div>
                    {employee.id === step.assigned_to && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

