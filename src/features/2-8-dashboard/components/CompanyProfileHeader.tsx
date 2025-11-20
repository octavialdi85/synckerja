
import React from 'react';
import { Button } from '@/features/ui/button';
import { Edit } from 'lucide-react';
import { CompanyProfilePhoto } from './CompanyProfilePhoto';

interface CompanyProfileHeaderProps {
  companyName: string;
  logoUrl?: string | null;
  isEditMode: boolean;
  onEdit: () => void;
  onLogoUpdate: (logoUrl: string | null) => void;
}

export const CompanyProfileHeader = ({ 
  companyName, 
  logoUrl, 
  isEditMode,
  onEdit, 
  onLogoUpdate 
}: CompanyProfileHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
      <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 min-w-0 flex-1">
        <div className="flex-shrink-0">
          <CompanyProfilePhoto 
            companyName={companyName}
            logoUrl={logoUrl}
            onLogoUpdate={onLogoUpdate}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{companyName || 'Company Name'}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Company Profile</p>
        </div>
      </div>
      {!isEditMode && (
        <div className="flex-shrink-0">
          <Button 
            onClick={onEdit} 
            variant="outline" 
            className="flex items-center space-x-2 w-full sm:w-auto"
            size="sm"
          >
            <Edit className="h-4 w-4" />
            <span className="whitespace-nowrap">Edit Company Details</span>
          </Button>
        </div>
      )}
    </div>
  );
};
