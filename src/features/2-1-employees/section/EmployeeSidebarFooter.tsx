import React from 'react';

interface EmployeeSidebarFooterProps {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
}

export const EmployeeSidebarFooter = ({ 
  totalEmployees, 
  activeEmployees, 
  totalDepartments 
}: EmployeeSidebarFooterProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 mt-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total Employees: {totalEmployees}</span>
        <span className="text-xs text-gray-400">Departments: {totalDepartments}</span>
      </div>
    </div>
  );
};
