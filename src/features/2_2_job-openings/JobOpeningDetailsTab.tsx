import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import { JobOpeningFormData } from './hooks/jobOpeningTypes';

interface JobOpeningDetailsTabProps {
  formData: JobOpeningFormData;
  onInputChange: (field: keyof JobOpeningFormData, value: any) => void;
}

export const JobOpeningDetailsTab = ({
  formData,
  onInputChange
}: JobOpeningDetailsTabProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="job_description">Job Description *</Label>
        <Textarea
          id="job_description"
          value={formData.job_description}
          onChange={(e) => onInputChange('job_description', e.target.value)}
          placeholder="Describe the job role, key responsibilities, and what we're looking for..."
          rows={4}
          required
          className="mt-1"
        />
        {!formData.job_description.trim() && (
          <p className="text-sm text-red-600 mt-1">Job description is required</p>
        )}
      </div>

      <div>
        <Label htmlFor="requirements">Requirements *</Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) => onInputChange('requirements', e.target.value)}
          placeholder="List the required qualifications, skills, experience, education, etc."
          rows={4}
          required
          className="mt-1"
        />
        {!formData.requirements.trim() && (
          <p className="text-sm text-red-600 mt-1">Requirements are required</p>
        )}
      </div>

      <div>
        <Label htmlFor="responsibilities">Responsibilities *</Label>
        <Textarea
          id="responsibilities"
          value={formData.responsibilities}
          onChange={(e) => onInputChange('responsibilities', e.target.value)}
          placeholder="Detail the day-to-day responsibilities and key duties..."
          rows={4}
          required
          className="mt-1"
        />
        {!formData.responsibilities.trim() && (
          <p className="text-sm text-red-600 mt-1">Responsibilities are required</p>
        )}
      </div>
    </div>
  );
};
