
import React from "react";
import { EmploymentDataStepProps } from '../types';
import { useDepartmentsCrud } from "../../MyInfo/Employment/hooks/crudMaster/useDepartmentsCrud";
import { useJobPositionsCrud } from "../../MyInfo/Employment/hooks/crudMaster/useJobPositionsCrud";
import { useJobLevelsCrud } from "../../MyInfo/Employment/hooks/crudMaster/useJobLevelsCrud";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { Button } from "@/features/ui/button";
import { Plus, MoreVertical, Edit, Trash2, ChevronDown } from "lucide-react";
import { MasterDataModal } from "@/features/share/MasterDataModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/ui/dropdown-menu";

const DepartmentPositionSection: React.FC<EmploymentDataStepProps> = ({ formData, handleInputChange }) => {
  const { organizationId } = useCurrentOrg();
  
  const departmentsCrud = useDepartmentsCrud(organizationId);
  const jobLevelsCrud = useJobLevelsCrud(organizationId);
  
  const selectedDepartmentId = formData.department_id;
  
  const jobPositionsCrud = useJobPositionsCrud(
    organizationId,
    { department_id: selectedDepartmentId }
  );

  // Use data directly since filtering is now done server-side
  const filteredJobPositions = React.useMemo(() => {
    if (!jobPositionsCrud.data) return [];
    return jobPositionsCrud.data;
  }, [jobPositionsCrud.data]);

  // Reset job position when department changes
  React.useEffect(() => {
    if (selectedDepartmentId && formData.job_position_id) {
      const isValidPosition = filteredJobPositions.some(jp => jp.id === formData.job_position_id);
      if (!isValidPosition) {
        handleInputChange('job_position_id', '');
      }
    }
  }, [selectedDepartmentId, filteredJobPositions, formData.job_position_id]);

  const CustomDropdown = ({ 
    label, 
    value, 
    onChange, 
    options, 
    isLoading, 
    onAdd, 
    onEdit, 
    onDelete, 
    placeholder,
    disabled 
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ id: string; name: string; department_id?: string; isDefault?: boolean }>;
    isLoading: boolean;
    onAdd: () => void;
    onEdit: (item: { id: string; name: string; department_id?: string; isDefault?: boolean }) => void;
    onDelete: (id: string) => void;
    placeholder: string;
    disabled?: boolean;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">{label} *</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-6 px-2 text-xs"
          disabled={disabled}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-sm h-10 px-3"
            disabled={isLoading || disabled}
          >
            <span className="truncate">
              {isLoading 
                ? "Loading..." 
                : value 
                ? options.find(opt => opt.id === value)?.name || placeholder
                : placeholder
              }
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] bg-white border shadow-md">
          {!isLoading && options.map((option) => (
            <div key={option.id} className="flex items-center">
              <DropdownMenuItem
                onClick={() => onChange(option.id)}
                className="flex-1 cursor-pointer text-xs py-2 px-3"
              >
                {option.name}
              </DropdownMenuItem>
              {!option.isDefault && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 mx-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border shadow-md">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(option);
                      }}
                      className="text-xs"
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(option.id);
                      }}
                      className="text-red-600 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {!isLoading && options.length === 0 && (
            <DropdownMenuItem disabled className="text-xs text-gray-500">
              No options available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Department & Position</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Department */}
        <CustomDropdown
          label="Department"
          value={formData.department_id || ''}
          onChange={(value) => {
            handleInputChange('department_id', value);
            handleInputChange('job_position_id', '');
          }}
          options={departmentsCrud.data || []}
          isLoading={departmentsCrud.isLoading}
          onAdd={departmentsCrud.openAddModal}
          onEdit={departmentsCrud.openEditModal}
          onDelete={departmentsCrud.deleteItem}
          placeholder="Select department"
        />

        {/* Job Position */}
        <CustomDropdown
          label="Job Position"
          value={formData.job_position_id || ''}
          onChange={(value) => handleInputChange('job_position_id', value)}
          options={filteredJobPositions}
          isLoading={jobPositionsCrud.isLoading}
          onAdd={jobPositionsCrud.openAddModal}
          onEdit={jobPositionsCrud.openEditModal}
          onDelete={jobPositionsCrud.deleteItem}
          placeholder={!selectedDepartmentId ? "Select department first" : "Select job position"}
          disabled={!selectedDepartmentId}
        />

        {/* Job Level */}
        <CustomDropdown
          label="Job Level"
          value={formData.job_level_id || ''}
          onChange={(value) => handleInputChange('job_level_id', value)}
          options={jobLevelsCrud.data || []}
          isLoading={jobLevelsCrud.isLoading}
          onAdd={jobLevelsCrud.openAddModal}
          onEdit={jobLevelsCrud.openEditModal}
          onDelete={jobLevelsCrud.deleteItem}
          placeholder="Select job level"
        />
      </div>

      {/* Modals */}
      <MasterDataModal
        open={departmentsCrud.modalOpen}
        title="Department"
        value={departmentsCrud.editItem}
        onClose={departmentsCrud.closeModal}
        onSave={departmentsCrud.saveItem}
        saving={departmentsCrud.saving}
      />

      <MasterDataModal
        open={jobPositionsCrud.modalOpen}
        title="Job Position"
        value={jobPositionsCrud.editItem}
        onClose={jobPositionsCrud.closeModal}
        onSave={jobPositionsCrud.saveItem}
        saving={jobPositionsCrud.saving}
      />

      <MasterDataModal
        open={jobLevelsCrud.modalOpen}
        title="Job Level"
        value={jobLevelsCrud.editItem}
        onClose={jobLevelsCrud.closeModal}
        onSave={jobLevelsCrud.saveItem}
        saving={jobLevelsCrud.saving}
      />
    </div>
  );
};

export { DepartmentPositionSection };