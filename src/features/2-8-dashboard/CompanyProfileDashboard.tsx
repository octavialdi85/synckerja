
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CompanyProfileHeader,
  CompanyBasicInfo,
  CompanyMissionVision,
  CompanyDepartments,
  CompanyValues,
  CompanyLoadingState,
} from './components';
import { useCompanyProfile, useCompanyLogo, useUpdateCompany } from './hooks';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export const CompanyProfileDashboard = () => {
  const { data: currentEmployee } = useCurrentUserEmployee();
  const { data: companyData, isLoading } = useCompanyProfile();
  const { logoUrl, updateLogo } = useCompanyLogo();
  const { organizationId } = useCurrentOrg();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  // Fetch departments and calculate employee counts
  const { data: departmentsData = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments-with-counts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching departments:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate departments with employee counts
  const { departments, totalEmployees } = useMemo(() => {
    const deptCounts = new Map<string, number>();
    
    // Count employees per department
    employees.forEach(emp => {
      if (emp.department_id) {
        deptCounts.set(emp.department_id, (deptCounts.get(emp.department_id) || 0) + 1);
      }
    });

    // Map departments with counts
    const depts = departmentsData.map(dept => ({
      id: dept.id,
      name: dept.name,
      employee_count: deptCounts.get(dept.id) || 0,
    }));

    return {
      departments: depts,
      totalEmployees: employees.length,
    };
  }, [departmentsData, employees]);

  const isDepartmentsLoading = departmentsLoading || employeesLoading;
  const [isEditMode, setIsEditMode] = useState(false);
  const updateCompanyMutation = useUpdateCompany();

  // Form data state - managed at dashboard level
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone_number: '',
    website: '',
    email: '',
    industry: '',
    description: '',
    tax_id: '',
    established: '',
    about_us: '',
    mission: '',
    vision: '',
  });

  // Initialize form data from company data
  useEffect(() => {
    if (companyData) {
      setFormData({
        company_name: companyData.company_name || '',
        address: companyData.address || '',
        phone_number: companyData.phone_number || '',
        website: companyData.website || '',
        email: companyData.email || '',
        industry: companyData.industry || '',
        description: companyData.description || '',
        tax_id: companyData.tax_id || '',
        established: companyData.established || '',
        about_us: companyData.about_us || '',
        mission: companyData.mission || '',
        vision: companyData.vision || '',
      });
    }
  }, [companyData]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // Reset form data to original company data
    if (companyData) {
      setFormData({
        company_name: companyData.company_name || '',
        address: companyData.address || '',
        phone_number: companyData.phone_number || '',
        website: companyData.website || '',
        email: companyData.email || '',
        industry: companyData.industry || '',
        description: companyData.description || '',
        tax_id: companyData.tax_id || '',
        established: companyData.established || '',
        about_us: companyData.about_us || '',
        mission: companyData.mission || '',
        vision: companyData.vision || '',
      });
    }
    setIsEditMode(false);
  };

  const handleSave = async () => {
    try {
      await updateCompanyMutation.mutateAsync(formData);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save company data:', error);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return <CompanyLoadingState />;
  }

  // Use real company data or fallback to default values
  const displayCompanyData = {
    company_name: companyData?.company_name || 'Demo Company Ltd',
    address: companyData?.address || 'Jakarta, Indonesia',
    phone_number: companyData?.phone_number || '+62 21 1234 5678',
    website: companyData?.website || 'www.democompany.com',
    email: companyData?.email || 'contact@democompany.com',
    established: companyData?.established || '',
    // Use real employee count from useEmployeeDepartments hook
    employee_count: totalEmployees > 0 ? `${totalEmployees}` : '0',
    tax_id: companyData?.tax_id || '123456789',
    industry: companyData?.industry || 'Technology',
    description: companyData?.description || 'A leading technology company',
    mission: companyData?.mission || '',
    vision: companyData?.vision || '',
    about_us: companyData?.about_us || ''
  };

  return (
    <div className="w-full max-w-none space-y-2 sm:space-y-3">
      <CompanyProfileHeader 
        companyName={displayCompanyData.company_name}
        logoUrl={logoUrl}
        isEditMode={isEditMode}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onSave={handleSave}
        isSaving={updateCompanyMutation.isPending}
        onLogoUpdate={updateLogo}
      />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-3">
        {/* Left Column - Basic Info */}
        <div className="xl:col-span-2 space-y-2 sm:space-y-3 min-w-0">
          <CompanyBasicInfo 
            companyData={displayCompanyData} 
            formData={formData}
            isEditMode={isEditMode}
            onFieldChange={handleFieldChange}
          />
          <CompanyMissionVision 
            formData={formData}
            isEditMode={isEditMode}
            onFieldChange={handleFieldChange}
          />
        </div>
        
        {/* Right Column - Departments & Values */}
        <div className="space-y-2 sm:space-y-3 min-w-0">
          <CompanyDepartments 
            departments={departments} 
            isLoading={isDepartmentsLoading} 
          />
          <CompanyValues />
        </div>
      </div>
    </div>
  );
};

