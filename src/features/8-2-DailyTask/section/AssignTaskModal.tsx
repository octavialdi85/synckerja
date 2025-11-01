import React, { useState } from 'react';
import { User, Calendar, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { DueDatePicker } from './DueDatePicker';

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (assignment: { employeeId: string | null; deadline: string | null }) => void;
  currentAssignment?: { employeeId: string | null; deadline: string | null };
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  open,
  onOpenChange,
  onAssign,
  currentAssignment
}) => {
  const { data: employees = [] } = useAvailableEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>(
    currentAssignment?.employeeId || 'unassigned'
  );
  const [deadline, setDeadline] = useState<string>(currentAssignment?.deadline || '');

  // Reset state when modal opens with new current assignment
  React.useEffect(() => {
    if (open) {
      setSelectedEmployee(currentAssignment?.employeeId || 'unassigned');
      setDeadline(currentAssignment?.deadline || '');
    }
  }, [open, currentAssignment]);

  const handleSubmit = () => {
    onAssign({
      employeeId: selectedEmployee === 'unassigned' ? null : selectedEmployee,
      deadline: deadline || null
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedEmployee('unassigned');
    setDeadline('');
  };

  const hasChanges = selectedEmployee !== 'unassigned' || deadline !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Assign Task
          </DialogTitle>
          <DialogDescription>
            Assign this task to an employee and set a deadline if needed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="border border-gray-200 rounded-lg">
                <SelectValue>
                  {selectedEmployee && selectedEmployee !== 'unassigned' ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">
                        {employees.find(e => e.id === selectedEmployee)?.full_name || 'Select...'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">Unassigned</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Unassigned
                  </div>
                </SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      {employee.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (Optional)
            </label>
            <DueDatePicker value={deadline} onChange={setDeadline} />
            {deadline && (
              <p className="text-xs text-gray-500 mt-1">
                Due: {new Date(deadline).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={!hasChanges}
              className="text-gray-600"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Assign
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


