import { Users, UserCheck, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeOverviewProps {
  employees?: any[];
}

export const EmployeeOverview = ({ employees = [] }: EmployeeOverviewProps) => {

  // Calculate real data from employees
  const activeEmployees = employees.filter(e => (e.employee_status_name || e.status) === 'active').length;
  const newHiresThisMonth = employees.filter(e => {
    if (!e.join_date) return false;
    const joinDate = new Date(e.join_date);
    const thisMonth = new Date();
    return joinDate.getMonth() === thisMonth.getMonth() && 
           joinDate.getFullYear() === thisMonth.getFullYear();
  }).length;

  // Get unique departments
  const uniqueDepartments = [...new Set(employees.map(e => e.department_name).filter(Boolean))];
  const totalDepartments = uniqueDepartments.length;

  // Get top department (department with most employees)
  const departmentCounts = uniqueDepartments.map(dept => ({
    name: dept,
    count: employees.filter(e => e.department_name === dept).length
  }));
  const topDepartment = departmentCounts.reduce((max, current) => 
    current.count > max.count ? current : max, departmentCounts[0] || { name: 'N/A', count: 0 });

  // Calculate average tenure
  const now = new Date();
  const tenures = employees.map(e => {
    if (!e.join_date) return 0;
    const joinDate = new Date(e.join_date);
    return Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }).filter(tenure => tenure > 0);
  const avgTenure = tenures.length > 0 ? tenures.reduce((sum, tenure) => sum + tenure, 0) / tenures.length : 0;

  return (
    <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-800">Active Employees</p>
                <p className="text-lg font-bold text-blue-900">{activeEmployees}</p>
              </div>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-800">New Hires This Month</p>
                <p className="text-lg font-bold text-green-900">{newHiresThisMonth}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-800">Total Departments</p>
                <p className="text-lg font-bold text-purple-900">{totalDepartments}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Top Department */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            Top Department
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{topDepartment.name}</p>
                <p className="text-xs text-gray-500">{topDepartment.count} employees</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Leading</p>
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Tenure */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Average Tenure
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{avgTenure.toFixed(1)} years</p>
                <p className="text-xs text-gray-500">Team experience</p>
              </div>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Recent Activity
          </h4>
          <div className="space-y-2">
            {employees.slice(0, 3).map((employee) => (
              <div key={employee.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-xs text-gray-500">{employee.department_name || 'No Department'} • {employee.job_position_name || 'No Position'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {employee.join_date ? format(new Date(employee.join_date), 'MMM dd') : 'N/A'}
                    </p>
                    <div className={`w-2 h-2 rounded-full mt-1 ${
                      (employee.employee_status_name || employee.status) === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};
