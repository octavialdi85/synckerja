
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Button } from '@/features/ui/button';
import { MapPin, Phone, Globe, Mail, Calendar, Users, Hash, Briefcase, Save, X } from 'lucide-react';
import { useUpdateCompany, useCompanyProfile } from '../hooks';

interface CompanyData {
  company_name: string;
  address: string;
  phone_number: string;
  website: string;
  email: string;
  established: string;
  employee_count: string;
  tax_id: string;
  industry: string;
  description: string;
}

interface CompanyBasicInfoProps {
  companyData: CompanyData;
  isEditMode: boolean;
  onEditModeChange: (mode: boolean) => void;
}

export const CompanyBasicInfo = ({ companyData, isEditMode, onEditModeChange }: CompanyBasicInfoProps) => {
  const { data: realCompanyData } = useCompanyProfile();
  const updateCompanyMutation = useUpdateCompany();
  
  const [formData, setFormData] = useState({
    company_name: companyData.company_name,
    address: companyData.address,
    phone_number: companyData.phone_number,
    website: companyData.website,
    email: companyData.email,
    industry: companyData.industry,
    description: companyData.description,
    tax_id: companyData.tax_id,
  });

  useEffect(() => {
    if (realCompanyData) {
      setFormData({
        company_name: realCompanyData.company_name || companyData.company_name,
        address: realCompanyData.address || companyData.address,
        phone_number: realCompanyData.phone_number || companyData.phone_number,
        website: realCompanyData.website || companyData.website,
        email: realCompanyData.email || companyData.email,
        industry: realCompanyData.industry || companyData.industry,
        description: realCompanyData.description || companyData.description,
        tax_id: realCompanyData.tax_id || companyData.tax_id,
      });
    }
  }, [realCompanyData, companyData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateCompanyMutation.mutateAsync(formData);
      onEditModeChange(false);
    } catch (error) {
      console.error('Failed to update company:', error);
    }
  };

  const handleCancel = () => {
    if (realCompanyData) {
      setFormData({
        company_name: realCompanyData.company_name || companyData.company_name,
        address: realCompanyData.address || companyData.address,
        phone_number: realCompanyData.phone_number || companyData.phone_number,
        website: realCompanyData.website || companyData.website,
        email: realCompanyData.email || companyData.email,
        industry: realCompanyData.industry || companyData.industry,
        description: realCompanyData.description || companyData.description,
        tax_id: realCompanyData.tax_id || companyData.tax_id,
      });
    }
    onEditModeChange(false);
  };

  const infoItems = [
    { icon: MapPin, label: 'Address', field: 'address', value: companyData.address },
    { icon: Phone, label: 'Phone', field: 'phone_number', value: companyData.phone_number },
    { icon: Globe, label: 'Website', field: 'website', value: companyData.website },
    { icon: Mail, label: 'Email', field: 'email', value: companyData.email },
    { icon: Calendar, label: 'Established', field: 'established', value: companyData.established, readOnly: true },
    { icon: Users, label: 'Employees', field: 'employee_count', value: `${companyData.employee_count} employees`, readOnly: true },
    { icon: Hash, label: 'Tax ID', field: 'tax_id', value: companyData.tax_id },
    { icon: Briefcase, label: 'Industry', field: 'industry', value: companyData.industry },
  ];

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pb-3">
        <CardTitle className="text-lg sm:text-xl font-semibold truncate">Company Information</CardTitle>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditMode && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={updateCompanyMutation.isPending}
                className="flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateCompanyMutation.isPending}
                className="flex items-center space-x-1"
              >
                <Save className="h-4 w-4" />
                <span>{updateCompanyMutation.isPending ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          )}
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            Basic Info
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg bg-gray-50 min-w-0">
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <Label className="text-xs sm:text-sm font-medium text-gray-900">{item.label}</Label>
                {isEditMode && !item.readOnly ? (
                  <Input
                    value={formData[item.field as keyof typeof formData] || ''}
                    onChange={(e) => handleInputChange(item.field, e.target.value)}
                    className="mt-1 text-xs sm:text-sm"
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600 break-words mt-1">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm sm:text-base font-medium text-blue-900 mb-2">Company Description</h4>
          {isEditMode ? (
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="text-xs sm:text-sm resize-none"
              placeholder="Enter company description"
            />
          ) : (
            <p className="text-xs sm:text-sm text-blue-800 break-words leading-relaxed">{companyData.description || 'No description provided'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
