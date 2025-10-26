
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Lock, CheckCircle } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  job_position_name?: string;
}

interface PICCellProps {
  picId: string | null;
  isPICLocked: boolean;
  employees: Employee[];
  selectedPIC: Employee | undefined;
  onPICChange: (value: string) => void;
  isAutoAssigned?: boolean;
}

export const PICCell: React.FC<PICCellProps> = ({
  picId,
  isPICLocked,
  employees,
  selectedPIC,
  onPICChange,
  isAutoAssigned = false
}) => {
  if (isPICLocked) {
    return (
      <div className="flex items-center gap-2 h-8 px-3 bg-gray-50 border border-gray-200 rounded-sm text-xs">
        <Lock className="h-3 w-3 text-gray-400" />
        <span className="font-medium text-green-600">
          {selectedPIC?.full_name || 'Auto-assigned PIC'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Select
        value={picId || 'placeholder'}
        onValueChange={(value) => {
          if (value === 'placeholder') return;
          onPICChange(value);
        }}
      >
        <SelectTrigger className="h-8 text-xs border-gray-200 rounded-sm">
          <SelectValue placeholder="Select PIC" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="placeholder" disabled>Select PIC</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              <div className="flex flex-col">
                <span className="font-medium">{employee.full_name}</span>
                <span className="text-xs text-gray-500">{employee.job_position_name || 'Unknown Position'}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isAutoAssigned && selectedPIC && (
        <div className="absolute -top-1 -right-1">
          <CheckCircle className="h-4 w-4 text-green-500 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
};
