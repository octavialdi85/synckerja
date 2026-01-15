import { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { JobBenefit } from './hooks/jobOpeningTypes';

interface BenefitsManagerProps {
  benefits: JobBenefit[];
  onChange: (benefits: JobBenefit[]) => void;
}

export const BenefitsManager = ({ benefits, onChange }: BenefitsManagerProps) => {
  const [localBenefits, setLocalBenefits] = useState<JobBenefit[]>(benefits || []);

  const handleAddBenefit = () => {
    const newBenefits = [...localBenefits, { title: '', description: '' }];
    setLocalBenefits(newBenefits);
    onChange(newBenefits);
  };

  const handleRemoveBenefit = (index: number) => {
    const newBenefits = localBenefits.filter((_, i) => i !== index);
    setLocalBenefits(newBenefits);
    onChange(newBenefits);
  };

  const handleUpdateBenefit = (index: number, field: 'title' | 'description', value: string) => {
    const newBenefits = localBenefits.map((benefit, i) => {
      if (i === index) {
        return { ...benefit, [field]: value };
      }
      return benefit;
    });
    setLocalBenefits(newBenefits);
    onChange(newBenefits);
  };

  // Sync with external changes
  useEffect(() => {
    if (benefits !== localBenefits) {
      setLocalBenefits(benefits || []);
    }
  }, [benefits]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Benefits</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBenefit}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Benefit
        </Button>
      </div>

      {localBenefits.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No benefits added yet. Click "Add Benefit" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {localBenefits.map((benefit, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Benefit {index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBenefit(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`benefit-title-${index}`}>Title</Label>
                <Input
                  id={`benefit-title-${index}`}
                  placeholder="e.g., Health Insurance"
                  value={benefit.title}
                  onChange={(e) => handleUpdateBenefit(index, 'title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`benefit-description-${index}`}>Description</Label>
                <Textarea
                  id={`benefit-description-${index}`}
                  placeholder="Enter benefit description..."
                  value={benefit.description}
                  onChange={(e) => handleUpdateBenefit(index, 'description', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
