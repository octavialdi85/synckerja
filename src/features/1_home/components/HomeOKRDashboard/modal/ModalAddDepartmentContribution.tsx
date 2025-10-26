import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useObjectives } from '../component/ObjectivesTabImport/useObjectives';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useToast } from '@/features/ui/use-toast';
import { Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface ModalAddDepartmentContributionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  cycleId: string;
  departmentId?: string;
  onSuccess?: () => void;
}

export const ModalAddDepartmentContribution = ({
  open,
  onOpenChange,
  organizationId,
  cycleId,
  departmentId,
  onSuccess
}: ModalAddDepartmentContributionProps) => {
  const [formData, setFormData] = useState({
    company_objective_id: '',
    title: '',
    description: '',
    why_important: '',
    metric_type: 'number' as 'number' | 'percentage' | 'currency' | 'boolean',
    unit: '',
    start_value: '0',
    target_value: '100',
    weight: '100'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUser();

  // Get company objectives to show in dropdown
  const { objectives: companyObjectives = [], isLoading: loadingObjectives, error: objectivesError } = useObjectives(organizationId, cycleId, 'company');
  
  // Debug logging
  console.log('ModalAddDepartmentContribution - organizationId:', organizationId);
  console.log('ModalAddDepartmentContribution - cycleId:', cycleId);
  console.log('ModalAddDepartmentContribution - companyObjectives:', companyObjectives);
  console.log('ModalAddDepartmentContribution - loadingObjectives:', loadingObjectives);
  console.log('ModalAddDepartmentContribution - objectivesError:', objectivesError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_objective_id || !formData.title) {
      toast({
        title: 'Error',
        description: 'Please select a company objective and enter a title',
        variant: 'destructive',
      });
      return;
    }

    if (!departmentId) {
      toast({
        title: 'Error',
        description: 'Department ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create department objective
      const { data, error } = await (supabase as any)
        .from('department_objectives')
        .insert({
          organization_id: organizationId,
          cycle_id: cycleId,
          department_id: departmentId,
          company_objective_id: formData.company_objective_id,
          title: formData.title,
          description: formData.description,
          why_important: formData.why_important,
          weight: parseFloat(formData.weight),
          status: 'active',
          owner_id: currentUser?.id || '',
          created_by: currentUser?.id || '',
          progress_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form
      setFormData({
        company_objective_id: '',
        title: '',
        description: '',
        why_important: '',
        metric_type: 'number',
        unit: '',
        start_value: '0',
        target_value: '100',
        weight: '100'
      });

      onSuccess?.();
      onOpenChange(false);

      toast({
        title: 'Success',
        description: 'Department contribution created successfully',
      });
    } catch (error) {
      console.error('Error creating department contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to create department contribution',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      company_objective_id: '',
      title: '',
      description: '',
      why_important: '',
      metric_type: 'number',
      unit: '',
      start_value: '0',
      target_value: '100',
      weight: '100'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-orange-600" />
            <span>Create Department Contribution</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Objective Selection */}
          <div className="space-y-2">
            <Label htmlFor="company_objective" className="text-sm font-medium">
              Company Objective <span className="text-red-500">*</span>
            </Label>
            {companyObjectives.length === 0 && !loadingObjectives && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                💡 No company objectives available. Please create a company objective first in the Company Objective tab.
              </p>
            )}
            <Select
              value={formData.company_objective_id}
              onValueChange={(value) => setFormData({ ...formData, company_objective_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company objective" />
              </SelectTrigger>
              <SelectContent>
                {loadingObjectives ? (
                  <SelectItem value="loading" disabled>
                    Loading company objectives...
                  </SelectItem>
                ) : objectivesError ? (
                  <SelectItem value="error" disabled>
                    Error loading objectives
                  </SelectItem>
                ) : companyObjectives.length > 0 ? (
                  companyObjectives.map((objective) => (
                    <SelectItem key={objective.id} value={objective.id}>
                      {objective.title}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-objectives" disabled>
                    No company objectives found. Please create a company objective first.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Department Objective Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Department Objective Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="What is your department contribution objective?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the department objective in detail"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Why Important */}
          <div className="space-y-2">
            <Label htmlFor="why_important" className="text-sm font-medium">
              Why this is important
            </Label>
            <Textarea
              id="why_important"
              placeholder="Explain why this objective is important and its impact"
              value={formData.why_important}
              onChange={(e) => setFormData({ ...formData, why_important: e.target.value })}
              rows={3}
            />
          </div>

          {/* Metric Type and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric_type" className="text-sm font-medium">
                Metric Type
              </Label>
              <Select
                value={formData.metric_type}
                onValueChange={(value: 'number' | 'percentage' | 'currency' | 'boolean') => 
                  setFormData({ ...formData, metric_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-medium">
                Unit
              </Label>
              <Input
                id="unit"
                placeholder="e.g., campaigns, designs, videos"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          {/* Start Value and Target Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_value" className="text-sm font-medium">
                Start Value
              </Label>
              <Input
                id="start_value"
                type="number"
                value={formData.start_value}
                onChange={(e) => setFormData({ ...formData, start_value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value" className="text-sm font-medium">
                Target Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="target_value"
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              />
            </div>
          </div>

          {/* Weight (Impact) */}
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-sm font-medium">
              Weight (Impact) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Department Contribution'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


