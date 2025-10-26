import React from 'react';
import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';

interface EmployeeMetricsCardsProps {
  employees?: any[];
  filteredEmployees?: any[];
}

export const EmployeeMetricsCards = ({ 
  employees = []
}: EmployeeMetricsCardsProps) => {
  // Calculate real metrics from employees data
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => (emp.employee_status_name || emp.status) === 'active').length;
  
  const newHires = employees.filter(emp => {
    if (!emp.join_date) return false;
    const joinDate = new Date(emp.join_date);
    const thisMonth = new Date();
    return joinDate.getMonth() === thisMonth.getMonth() && 
           joinDate.getFullYear() === thisMonth.getFullYear();
  }).length;
  
  const terminated = employees.filter(emp => 
    (emp.employee_status_name || emp.status) === 'terminated'
  ).length;

  const statsCards = [
    {
      title: 'Total Employees',
      value: totalEmployees.toString(),
      subtitle: 'All employees',
      icon: Users,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Employees',
      value: activeEmployees.toString(),
      subtitle: 'Currently employed',
      icon: UserCheck,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'New Hires',
      value: newHires.toString(),
      subtitle: 'This month',
      icon: UserPlus,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Terminated',
      value: terminated.toString(),
      subtitle: 'This month',
      icon: UserX,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
      {statsCards.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-md p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
