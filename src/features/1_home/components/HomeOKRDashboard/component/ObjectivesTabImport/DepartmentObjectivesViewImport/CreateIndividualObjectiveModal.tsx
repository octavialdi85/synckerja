import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Badge } from '@/features/ui/badge';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { User, Target, AlertCircle, RefreshCcw } from 'lucide-react';
import { useCreateIndividualObjective } from '../../../modal/useIndividualObjectives';
import { useDepartmentObjectives } from '../../../modal/useDepartmentObjectives';

interface CreateIndividualObjectiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export const CreateIndividualObjectiveModal: React.FC<CreateIndividualObjectiveModalProps> = ({
  open,
  onOpenChange,
  organizationId,
  cycleId,
  employeeId,
  employeeName,
  onSuccess
}) => {
  const { toast } = useToast();
  const createIndividualObjective = useCreateIndividualObjective();
  const { user } = useCurrentUser();
  
  // Get department objectives for parent selection
  const { data: departmentObjectives = [], isLoading: loadingDepartmentObjectives, refetch } = useDepartmentObjectives(
    organizationId, 
    cycleId ? [cycleId] : undefined,
    false // Don't include individual objectives for dropdown
  );

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_objective_id: '',
    status: 'draft' as 'draft' | 'active' | 'completed' | 'cancelled',
    weight: 100
  });

  const [keyResults, setKeyResults] = useState([
    {
      title: '',
      description: '',
      metric_type: 'number' as const,
      calculation_type: 'increase' as const,
      start_value: 0,
      target_value: 100,
      unit: ''
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an objective title',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get employee's user_id for ownership
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('user_id, department_id')
        .eq('id', employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error('Could not find employee information');
      }

      const objectiveData = {
        organization_id: organizationId,
        cycle_id: cycleId,
        department_objective_id: formData.department_objective_id === 'none' ? null : formData.department_objective_id || null,
        employee_id: employeeId,
        owner_id: employee.user_id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        weight: formData.weight,
        created_by: user.id
      };

      console.log('🚀 Creating individual objective:', objectiveData);

      await createIndividualObjective.mutateAsync(objectiveData);

      toast({
        title: 'Success',
        description: `Individual objective for ${employeeName} created successfully`,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        department_objective_id: '',
        status: 'draft',
        weight: 100
      });

      onSuccess?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('❌ Error creating individual objective:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create individual objective',
        variant: 'destructive',
      });
    }
  };

  const availableDepartmentObjectives = departmentObjectives.filter(obj => 
    obj.status === 'active' || obj.status === 'draft'
  );

  // Debug logging to help identify the issue
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 CreateIndividualObjectiveModal - Department Objectives Debug:', {
        totalObjectives: departmentObjectives.length,
        availableObjectives: availableDepartmentObjectives.length,
        allObjectives: departmentObjectives.map(obj => ({
          id: obj.id,
          title: obj.title,
          status: obj.status,
          cycle_id: obj.cycle_id,
          organization_id: obj.organization_id
        })),
        cycleId,
        organizationId,
        queryKey: ['department-objectives', organizationId, cycleId ? [cycleId] : undefined, false]
      });
      
      // Check specifically for "te" objective
      const teObjective = departmentObjectives.find(obj => obj.title === 'te');
      if (teObjective) {
        console.log('🚨 FOUND "te" OBJECTIVE:', {
          id: teObjective.id,
          title: teObjective.title,
          status: teObjective.status,
          cycle_id: teObjective.cycle_id,
          organization_id: teObjective.organization_id,
          created_at: teObjective.created_at,
          updated_at: teObjective.updated_at
        });
      } else {
        console.log('✅ No "te" objective found in departmentObjectives');
      }
    }
  }, [departmentObjectives, availableDepartmentObjectives, cycleId, organizationId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Active</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">Draft</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing department objectives...');
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-purple-600" />
            <span>Create Individual Objective for {employeeName}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Create a personal objective that {employeeName} will be responsible for achieving.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Objective Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Objective Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`What is the ${employeeName} individual objective?`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the individual objective in detail"
                rows={3}
              />
            </div>

            {/* Department Objective Selection (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="department_objective">Link to Department Objective (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loadingDepartmentObjectives}
                  className="h-6 px-2"
                >
                  <RefreshCcw className={`h-3 w-3 ${loadingDepartmentObjectives ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Select 
                value={formData.department_objective_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, department_objective_id: value }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select department objective (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-50">
                  <SelectItem value="none">No department objective</SelectItem>
                  {loadingDepartmentObjectives && (
                    <div className="p-2 text-center text-purple-600">Loading department objectives...</div>
                  )}
                  {!loadingDepartmentObjectives && availableDepartmentObjectives.map((objective) => (
                    <SelectItem key={objective.id} value={objective.id} className="cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col py-1 w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{objective.title}</span>
                          {getStatusBadge(objective.status)}
                        </div>
                        <span className="text-xs text-gray-500">
                          Progress: {objective.progress_percentage || 0}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'draft' | 'active' | 'completed' | 'cancelled') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (Impact) *</Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 100 }))}
                  placeholder="100"
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createIndividualObjective.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createIndividualObjective.isPending || !formData.title}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {createIndividualObjective.isPending ? 'Creating...' : 'Create Individual Objective'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
