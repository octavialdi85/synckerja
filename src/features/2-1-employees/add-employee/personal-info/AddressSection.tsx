
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { PersonalDataStepProps } from '../types';

export const AddressSection = ({ formData, handleInputChange }: PersonalDataStepProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 mt-6">
      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium">
          Address
        </Label>
        <Textarea 
          id="address" 
          value={formData.address || ''} 
          onChange={e => handleInputChange('address', e.target.value)} 
          placeholder="Enter address" 
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]" 
        />
      </div>
    </div>
  );
};


