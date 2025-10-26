
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { CustomDatePicker as Calendar } from '@/features/share/calendar/CustomDatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useEmployeeTargets } from '../hook/useEmployeeTargets';
import { CreateEmployeeTargetRequest, EmployeeTarget } from '../types/employee-targets';
import { toast } from 'sonner';

interface EditTargetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  targetType: 'content_planning' | 'content_production' | 'content_posting';
  existingTarget?: EmployeeTarget;
}

const EditTargetDialog: React.FC<EditTargetDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  targetType,
  existingTarget
}) => {
  const { createTarget, updateTarget, isCreating, isUpdating } = useEmployeeTargets();

  const [formData, setFormData] = useState<{
    target_category: EmployeeTarget['target_category'];
    start_date: string;
    end_date: string;
    target_value: number;
    description: string;
  }>({
    target_category: 'monthly',
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    target_value: 0,
    description: '',
  });

  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (existingTarget) {
        setFormData({
          target_category: existingTarget.target_category,
          start_date: existingTarget.start_date,
          end_date: existingTarget.end_date,
          target_value: existingTarget.target_value,
          description: existingTarget.description || '',
        });
      } else {
        // Reset to defaults for new target
        const today = new Date();
        setFormData({
          target_category: 'monthly',
          start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
          target_value: 0,
          description: '',
        });
      }
    }
  }, [isOpen, existingTarget]);

  // Auto-adjust dates when category changes
  const handleCategoryChange = (category: EmployeeTarget['target_category']) => {
    const today = new Date();
    let startDate = today;
    let endDate = today;

    switch (category) {
      case 'daily':
        startDate = today;
        endDate = today;
        break;
      case 'weekly':
        startDate = today;
        endDate = addDays(today, 6);
        break;
      case 'monthly':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
    }

    setFormData(prev => ({
      ...prev,
      target_category: category,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    }));
  };

  const handleSave = async () => {
    if (!employeeId) {
      toast.error('Employee ID is required');
      return;
    }

    if (formData.target_value <= 0) {
      toast.error('Target value must be greater than 0');
      return;
    }

    try {
      if (existingTarget) {
        // Update existing target
        await updateTarget({
          targetId: existingTarget.id,
          updates: {
            target_value: formData.target_value,
            description: formData.description,
          }
        });
        toast.success('Target updated successfully');
      } else {
        // Create new target
        const newTarget: CreateEmployeeTargetRequest = {
          employee_id: employeeId,
          target_type: targetType,
          target_category: formData.target_category,
          start_date: formData.start_date,
          end_date: formData.end_date,
          target_value: formData.target_value,
          description: formData.description,
        };

        await createTarget(newTarget);
        toast.success('Target created successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving target:', error);
      toast.error('Failed to save target');
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'content_planning':
        return 'Content Planning Target';
      case 'content_production':
        return 'Content Production Target';
      case 'content_posting':
        return 'Content Posting Target';
      default:
        return 'Target';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md edit-target-dialog" style={{ zIndex: 999999 }}>
        <DialogHeader>
          <DialogTitle>
            {existingTarget ? 'Edit' : 'Create'} {getTargetTypeLabel()}
          </DialogTitle>
          {employeeName && (
            <p className="text-sm text-gray-600">Employee: {employeeName}</p>
          )}
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!existingTarget && (
            <div>
              <Label htmlFor="category">Target Period</Label>
              <Select 
                value={formData.target_category} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  style={{ zIndex: 999999 }}
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!existingTarget && (
            <>
              <div>
                <Label>Start Date</Label>
                <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(formData.start_date), "dd MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" style={{ zIndex: 999999 }}>
                    <Calendar
                      selected={new Date(formData.start_date)}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => ({ 
                            ...prev, 
                            start_date: format(date, 'yyyy-MM-dd') 
                          }));
                          setIsStartDateOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(formData.end_date), "dd MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" style={{ zIndex: 999999 }}>
                    <Calendar
                      selected={new Date(formData.end_date)}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => ({ 
                            ...prev, 
                            end_date: format(date, 'yyyy-MM-dd') 
                          }));
                          setIsEndDateOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="target_value">Target Value</Label>
            <Input
              id="target_value"
              type="number"
              min="1"
              value={formData.target_value || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                target_value: parseInt(e.target.value) || 0 
              }))}
              placeholder="Enter target value"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              placeholder="Add target description..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingTarget ? 'Update' : 'Create'} Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTargetDialog;
