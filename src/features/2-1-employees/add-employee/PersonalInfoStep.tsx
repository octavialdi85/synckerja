
import { ScrollArea } from '@/features/ui/scroll-area';
import { PersonalDataStepProps } from './types';
import { PersonalDetailsSection } from './personal-info/PersonalDetailsSection';
import { IdentitySection } from './personal-info/IdentitySection';
import { AddressSection } from './personal-info/AddressSection';
import { DocumentUploadSection } from './personal-info/DocumentUploadSection';

export const PersonalInfoStep = ({ formData, handleInputChange }: PersonalDataStepProps) => {
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-8">
        <PersonalDetailsSection formData={formData} handleInputChange={handleInputChange} />
        <IdentitySection formData={formData} handleInputChange={handleInputChange} />
        <AddressSection formData={formData} handleInputChange={handleInputChange} />
        <DocumentUploadSection formData={formData} handleInputChange={handleInputChange} />
      </div>
    </ScrollArea>
  );
};
