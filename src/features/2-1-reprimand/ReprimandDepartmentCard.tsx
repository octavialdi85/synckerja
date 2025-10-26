import { AlertTriangle } from 'lucide-react';
import { Button } from '@/features/ui/button';
import ReprimandViewDropdown from './ReprimandViewDropdown';

interface Employee {
  id: string;
  full_name: string;
  job_position_name?: string;
  profile_photo_url?: string;
  photo_url?: string;
}

interface ReprimandData {
  id: string;
  employee_id: string;
  reprimand_type: string;
  severity_level: string;
  violation_category: string;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  violation_description: string;
  evidence_details?: string;
  witness_names?: string;
  previous_warnings_count: number;
  corrective_action_plan?: string;
  improvement_deadline?: string;
  follow_up_date?: string;
  status: string;
  acknowledgment_required: boolean;
  employee_acknowledged: boolean;
  acknowledgment_date?: string;
  is_formal: boolean;
  impact_on_performance_review: boolean;
  notes?: string;
  document_path?: string;
  issued_by: string;
  created_at: string;
  updated_at: string;
}

interface ReprimandDepartmentCardProps {
  departmentName: string;
  employees: Employee[];
  reprimands: ReprimandData[];
  getReprimandCount: (employeeId: string) => number;
  renderReprimandBoxes: (count: number) => JSX.Element[];
}

function ReprimandDepartmentCard({
  departmentName,
  employees,
  reprimands,
  getReprimandCount,
  renderReprimandBoxes,
}: ReprimandDepartmentCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-2">
      {/* Department Header - TIDAK DIUBAH */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-2">
        <h2 className="text-lg font-bold text-white">{departmentName}</h2>
        <p className="text-red-100 text-xs">{employees.length} employees</p>
      </div>

      {/* Employee List */}
      <div className="p-3">
        <div className="space-y-2">
          {employees.map((employee) => {
            const reprimandCount = getReprimandCount(employee.id);
            
            return (
              <div key={employee.id} className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {/* Employee Info Row - Now handled by dropdown */}
                <ReprimandViewDropdown
                  employeeId={employee.id}
                  employeeName={employee.full_name}
                  jobPosition={employee.job_position_name}
                  profilePhotoUrl={employee.profile_photo_url || employee.photo_url}
                  reprimandCount={reprimandCount}
                  reprimandBoxes={renderReprimandBoxes(reprimandCount)}
                  reprimands={reprimands.filter(r => r.employee_id === employee.id)}
                />

              </div>
            );
          })}
        </div>

        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No employees in this department</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReprimandDepartmentCard;
