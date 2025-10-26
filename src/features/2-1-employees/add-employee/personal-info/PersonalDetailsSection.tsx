
import { Label } from '@/features/ui/label';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { PersonalDataStepProps } from '../types';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const maritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const religionOptions = [
  { value: 'islam', label: 'Islam' },
  { value: 'christian', label: 'Christian' },
  { value: 'catholic', label: 'Catholic' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'buddha', label: 'Buddha' },
  { value: 'confucius', label: 'Confucius' },
  { value: 'other', label: 'Other' },
];

export const PersonalDetailsSection = ({ formData, handleInputChange }: PersonalDataStepProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="name" 
            value={formData.name || ''} 
            onChange={e => handleInputChange('name', e.target.value)} 
            placeholder="Enter full name" 
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email || ''} 
            onChange={e => handleInputChange('email', e.target.value)} 
            placeholder="Enter email address" 
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
        </div>

        {/* Mobile Phone */}
        <div className="space-y-2">
          <Label htmlFor="mobile_phone" className="text-sm font-medium">
            Mobile Phone <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="mobile_phone" 
            value={formData.mobile_phone || ''} 
            onChange={e => handleInputChange('mobile_phone', e.target.value)} 
            placeholder="Enter mobile phone number" 
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
        </div>

        {/* Religion */}
        <div className="space-y-2">
          <Label htmlFor="religion" className="text-sm font-medium">
            Religion
          </Label>
          <Select value={formData.religion || ''} onValueChange={value => handleInputChange('religion', value)}>
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {religionOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <Label htmlFor="birth_date" className="text-sm font-medium">
            Birth Date
          </Label>
          <Input 
            id="birth_date" 
            type="date" 
            value={formData.birth_date || ''} 
            onChange={e => handleInputChange('birth_date', e.target.value)} 
            placeholder="mm/dd/yyyy" 
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm font-medium">
            Gender
          </Label>
          <Select value={formData.gender || ''} onValueChange={value => handleInputChange('gender', value)}>
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marital Status */}
        <div className="space-y-2">
          <Label htmlFor="marital_status" className="text-sm font-medium">
            Marital Status
          </Label>
          <Select value={formData.marital_status || ''} onValueChange={value => handleInputChange('marital_status', value)}>
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select marital status" />
            </SelectTrigger>
            <SelectContent>
              {maritalStatusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

