import React, { useState, useEffect } from 'react';
import { Users, X, Search } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  status?: string;
}

interface AssignStepDialogProps {
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

export const AssignStepDialog = ({ step, onAssign, onUnassign, onClose }: AssignStepDialogProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dueDate, setDueDate] = useState<string>('');
  const [savingDue, setSavingDue] = useState<boolean>(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  useEffect(() => {
    if (organizationId) {
      fetchEmployees();
    }
  }, [organizationId]);

  // Load current assignment and due date (if any)
  useEffect(() => {
    const loadAssignmentAndDue = async () => {
      try {
        if (!organizationId || !step?.id) return;
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
          }
        } else {
          setActiveAssignmentId(null);
        }
      } catch (e) {
        console.warn('Failed to load assignment/due date', e);
      }
    };
    loadAssignmentAndDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, organizationId]);

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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      if (!organizationId) {
        console.log('No organization ID available');
        return;
      }

      console.log('Fetching employees for organization:', organizationId);

      // Fetch employees from the same organization
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;

      console.log('Fetched employees:', data);
      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveDueDateIso = (): string | null => {
    return dueDate ? new Date(dueDate).toISOString() : null;
  };

  const handleAssign = (employeeId: string) => {
    onAssign(employeeId, resolveDueDateIso());
  };

  const handleUnassign = () => {
    onUnassign();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Step: {step.title}
          </DialogTitle>
          <DialogDescription>
            Select an employee to assign this step to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              className="pl-10"
            />
          </div>

          {/* Due Date (single field, autosave) */}
          <div>
            <label className="text-xs text-gray-500">Due date</label>
            <Input
              type="date"
              className="mt-1 h-9"
              value={dueDate}
              onChange={async (e) => {
                const val = e.target.value;
                setDueDate(val);
                // autosave only if an active assignment exists
                if (!activeAssignmentId) return;
                try {
                  setSavingDue(true);
                  // store as append-only (latest wins)
                  const iso = val ? new Date(val).toISOString() : null;
                  if (iso) {
                    await supabase
                      .from('task_steps_assigned_duedate')
                      .insert({
                        organization_id: organizationId,
                        task_steps_assigned_id: activeAssignmentId,
                        due_date: iso,
                      });
                  }
                } catch (err) {
                  console.error('Autosave due date failed', err);
                  toast({ title: 'Error', description: 'Failed to save due date', variant: 'destructive' });
                } finally {
                  setSavingDue(false);
                }
              }}
            />
            {savingDue && <div className="text-[10px] text-gray-400 mt-1">Saving…</div>}
          </div>

          {/* Employee List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
