interface EmployeeTableFooterProps {
  totalEmployees: number;
  activeEmployees: number;
  filteredEmployees?: number;
  selectedDepartment?: string;
}

export const EmployeeTableFooter = ({ 
  totalEmployees, 
  activeEmployees, 
  filteredEmployees = totalEmployees,
  selectedDepartment 
}: EmployeeTableFooterProps) => {
  const departmentText = selectedDepartment && selectedDepartment !== 'all' 
    ? ` in ${selectedDepartment}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredEmployees} of {totalEmployees} employees{departmentText}</span>
        <span className="text-xs text-gray-400">Total: {totalEmployees} employees</span>
      </div>
    </div>
  );
};
