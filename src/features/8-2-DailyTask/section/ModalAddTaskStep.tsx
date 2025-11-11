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
import { Plus, ListChecks } from 'lucide-react';
import { useDailyTask } from '../DailyTaskContext';
import { useToast } from '@/features/1-login/hooks/use-toast';
// import { useTranslation } from 'react-i18next';

export interface ModalAddTaskStepProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

export const ModalAddTaskStep = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  onSuccess
}: ModalAddTaskStepProps) => {
  // const { t } = useTranslation();
  const [stepTitle, setStepTitle] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTaskStep } = useDailyTask();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stepTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a step title',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addTaskStep(taskId, stepTitle.trim());

      // Reset form
      setStepTitle('');
      setStepDescription('');

      onSuccess?.();
      onOpenChange(false);

      toast({
        title: 'Success',
        description: 'Step added successfully',
      });
    } catch (error) {
      console.error('Error adding step:', error);
      toast({
        title: 'Error',
        description: 'Failed to add step',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setStepTitle('');
    setStepDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen md:w-auto md:h-auto md:max-w-lg border-none bg-card p-0 shadow-xl focus:outline-none flex flex-col m-0 rounded-none md:rounded-lg translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] left-0 top-0 md:left-[50%] md:top-[50%]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center space-x-2">
              <ListChecks className="h-5 w-5 text-blue-600" />
              <span>Add New Step</span>
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">
            Task:
          </p>
          <p className="text-sm text-blue-800 font-semibold">{taskTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step Title */}
          <div className="space-y-2">
            <Label htmlFor="step_title" className="text-sm font-medium">
              Step Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="step_title"
              placeholder='e.g., Review document, Send email, etc.'
              value={stepTitle}
              onChange={(e) => setStepTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">
              Break down your task into smaller, actionable steps
            </p>
          </div>

          {/* Step Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="step_description" className="text-sm font-medium">
              Description <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="step_description"
              placeholder='Add more details about this step...'
              value={stepDescription}
              onChange={(e) => setStepDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Tips Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              💡 Tips for creating effective steps:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Keep steps small and specific</li>
              <li>Use action verbs (e.g., "Review", "Send", "Create")</li>
              <li>Make each step completable in one sitting</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stepTitle.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </div>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

