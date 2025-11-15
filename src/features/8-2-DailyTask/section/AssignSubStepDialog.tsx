import React, { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  status?: string;
}

interface AssignSubStepDialogProps {
  subStep: {
    id: string;
    title: string;
    parent_step_id: string; // NEW: untuk fetch step due_date
    assigned_to?: string | null;
    assigned_employee?: {
      id: string;
      full_name: string;
      email?: string;
    } | null;
  };
  onAssign: (employeeId: string, dueDateIso: string) => void; // NEW: wajib dueDateIso
  onUnassign: () => void;
  onClose: () => void;
}

export const AssignSubStepDialog = ({ subStep, onAssign, onUnassign, onClose }: AssignSubStepDialogProps) => {
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [stepDueDate, setStepDueDate] = useState<string | null>(null);
  const [dueDateError, setDueDateError] = useState<string | null>(null);
  const { data: employees = [], isLoading: loading } = useAvailableEmployees();
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();

  // Fetch step due_date on mount
  useEffect(() => {
    const loadStepDueDate = async () => {
      if (!organizationId || !subStep.parent_step_id) return;
      
      try {
        // Get step assignment
        const { data: assigns } = await supabase
          .from('task_steps_assigned')
          .select('id')
          .eq('task_step_id', subStep.parent_step_id)
          .order('assigned_at', { ascending: false })
          .limit(1);
        
        if (assigns && assigns.length > 0) {
          const { data: dueRows } = await supabase
            .from('task_steps_assigned_duedate')
            .select('due_date')
            .eq('task_steps_assigned_id', assigns[0].id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          const stepDue = dueRows?.[0]?.due_date as string | undefined;
          if (stepDue) {
            setStepDueDate(stepDue);
            // Auto-set to step due_date
            const d = new Date(stepDue);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setDueDate(`${yyyy}-${mm}-${dd}`);
          }
        }

        // Check if sub-step already has due_date
        if (subStep.assigned_to) {
          const { data: subAssigns } = await supabase
            .from('task_steps_to_steps_assigned')
            .select('id')
            .eq('task_steps_to_steps_id', subStep.id)
            .order('assigned_at', { ascending: false })
            .limit(1);
          
          if (subAssigns && subAssigns.length > 0) {
            const { data: subDueRows } = await supabase
              .from('task_steps_assigned_duedate')
              .select('due_date')
              .eq('task_steps_to_steps_assigned_id', subAssigns[0].id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            const subDue = subDueRows?.[0]?.due_date as string | undefined;
            if (subDue) {
              const d = new Date(subDue);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              setDueDate(`${yyyy}-${mm}-${dd}`);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load step due_date', e);
      }
    };
    
    loadStepDueDate();
  }, [subStep.parent_step_id, subStep.id, subStep.assigned_to, organizationId]);

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

  // Validate due_date
  const validateDueDate = (dateValue: string): string | null => {
    if (!dateValue) {
      return 'Due date is required';
    }
    
    if (!stepDueDate) {
      return null; // No step due_date, so no validation needed
    }
    
    const subDue = new Date(dateValue);
    const stepDue = new Date(stepDueDate);
    
    // Set time to end of day for comparison
    subDue.setHours(23, 59, 59, 999);
    stepDue.setHours(23, 59, 59, 999);
    
    if (subDue.getTime() > stepDue.getTime()) {
      return 'Due date cannot be greater than parent step due date';
    }
    
    return null;
  };

  const handleAssign = (employeeId: string) => {
    // Validate due_date
    const error = validateDueDate(dueDate);
    if (error) {
      setDueDateError(error);
      toast({ 
        title: 'Validation Error', 
        description: error, 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!dueDate) {
      toast({ 
        title: 'Validation Error', 
        description: 'Due date is required', 
        variant: 'destructive' 
      });
      return;
    }
    
    setDueDateError(null);
    const dueDateIso = new Date(dueDate).toISOString();
    onAssign(employeeId, dueDateIso);
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
            Assign Sub-Step: {subStep.title}
          </DialogTitle>
          <DialogDescription>
            Select an employee to assign this sub-step to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment */}
          {subStep.assigned_to && subStep.assigned_employee ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Currently Assigned To:</p>
                  <p className="text-sm text-green-700">{subStep.assigned_employee.full_name}</p>
                  {subStep.assigned_employee.email && (
                    <p className="text-xs text-green-600">{subStep.assigned_employee.email}</p>
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
              <p className="text-sm text-gray-600">This sub-step is not assigned to anyone yet.</p>
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

          {/* Due Date Input */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Due Date <span className="text-red-500">*</span>
              {stepDueDate && (
                <span className="text-gray-400 ml-1">
                  (Default: {new Date(stepDueDate).toLocaleDateString()})
                </span>
              )}
            </label>
            <Input
              type="date"
              className={`mt-1 h-9 ${dueDateError ? 'border-red-500' : ''}`}
              value={dueDate}
              onChange={(e) => {
                const val = e.target.value;
                setDueDate(val);
                const error = validateDueDate(val);
                setDueDateError(error);
                if (error) {
                  toast({
                    title: 'Warning',
                    description: error,
                    variant: 'destructive'
                  });
                }
              }}
              required
            />
            {dueDateError && (
              <p className="text-xs text-red-500 mt-1">{dueDateError}</p>
            )}
            {stepDueDate && !dueDateError && (
              <p className="text-xs text-gray-400 mt-1">
                Parent step due date: {new Date(stepDueDate).toLocaleDateString()}
              </p>
            )}
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
                    employee.id === subStep.assigned_to
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
                    {employee.id === subStep.assigned_to && (
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

