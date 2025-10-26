import React from 'react';

interface EmployeeTableFooterProps {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
}

export const EmployeeTableFooter = ({ 
  totalEmployees, 
  activeEmployees, 
  newHires 
}: EmployeeTableFooterProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total Employees: {totalEmployees}</span>
        <span className="text-xs text-gray-400">
          {totalEmployees > 0 ? `${Math.round((activeEmployees / totalEmployees) * 100)}% active` : 'No employees yet'}
        </span>
      </div>
    </div>
  );
};
