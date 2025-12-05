import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { cn } from '@/lib/utils';

interface EmployeeDropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  allOptionLabel?: string;
  includeAllOption?: boolean;
  disabled?: boolean;
}

export const EmployeeDropdown: React.FC<EmployeeDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "Select employee",
  triggerClassName,
  allOptionLabel = "All Employees",
  includeAllOption = false,
  disabled = false
}) => {
  const { data: employees = [], isLoading } = useAvailableEmployees();

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border shadow-lg">
        {includeAllOption && (
          <SelectItem value="all" className="text-xs">
            {allOptionLabel}
          </SelectItem>
        )}
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading employees...
          </SelectItem>
        ) : employees.length > 0 ? (
          employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id} className="text-xs">
              {employee.full_name || employee.email}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-employees" disabled>
            No employees found
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};





