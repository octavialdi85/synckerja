import { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import { Pencil, Check, X } from 'lucide-react';
import { JobOpeningFormData } from './hooks/jobOpeningTypes';

interface JobOpeningDetailsTabProps {
  formData: JobOpeningFormData;
  onInputChange: (field: keyof JobOpeningFormData, value: any) => void;
}

type DetailsSnapshot = Pick<JobOpeningFormData, 'job_description' | 'requirements' | 'responsibilities'>;

export const JobOpeningDetailsTab = ({
  formData,
  onInputChange
}: JobOpeningDetailsTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [snapshotForCancel, setSnapshotForCancel] = useState<DetailsSnapshot | null>(null);

  const handleStartEdit = () => {
    setIsEditing(true);
    setSnapshotForCancel({
      job_description: formData.job_description,
      requirements: formData.requirements,
      responsibilities: formData.responsibilities
    });
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    setSnapshotForCancel(null);
  };

  const handleCancelEdit = () => {
    if (snapshotForCancel) {
      onInputChange('job_description', snapshotForCancel.job_description);
      onInputChange('requirements', snapshotForCancel.requirements);
      onInputChange('responsibilities', snapshotForCancel.responsibilities);
    }
    setIsEditing(false);
    setSnapshotForCancel(null);
  };

  useEffect(() => {
    setIsEditing(false);
    setSnapshotForCancel(null);
  }, [formData.job_title]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            className="flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleSaveEdit} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Job Description
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.job_description?.trim() || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Requirements
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.requirements?.trim() || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Responsibilities
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.responsibilities?.trim() || '—'}
            </p>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};
