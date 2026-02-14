import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Separator } from '@/features/ui/separator';
import { ListChecks } from 'lucide-react';
import { useDailyTask } from '../DailyTaskContext';
import { useToast } from '@/features/ui/use-toast';
// import { useTranslation } from 'react-i18next';

export interface ModalAddTaskStepProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  editingStep?: {
    id: string;
    title: string;
    description?: string | null;
  } | null;
  onSuccess?: () => void;
}

export const ModalAddTaskStep = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  editingStep,
  onSuccess
}: ModalAddTaskStepProps) => {
  // const { t } = useTranslation();
  const [stepTitle, setStepTitle] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTaskStep, updateTaskStep } = useDailyTask();
  const { toast } = useToast();

  const isEditMode = !!editingStep;

  // Populate form when editing or reset when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editingStep) {
        // Edit mode: populate with existing data
        const titleValue = editingStep.title || '';
        // Handle description: if null/undefined, use empty string; otherwise use the value
        const descValue = editingStep.description != null ? editingStep.description : '';
        
        setStepTitle(titleValue);
        setStepDescription(descValue);
      } else {
        // Add mode: reset form
        setStepTitle('');
        setStepDescription('');
      }
    } else {
      // Reset when modal closes
      setStepTitle('');
      setStepDescription('');
    }
  }, [open, editingStep?.id, editingStep?.title, editingStep?.description]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
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
      if (isEditMode && editingStep) {
        // Edit mode: update existing step
        await updateTaskStep(editingStep.id, {
          title: stepTitle.trim(),
          description: stepDescription.trim() || null,
        });

        toast({
          title: 'Success',
          description: 'Step updated successfully',
        });
      } else {
        // Add mode: create new step
        await addTaskStep(taskId, stepTitle.trim(), stepDescription.trim() || undefined);

        toast({
          title: 'Success',
          description: 'Step added successfully',
        });
      }

      // Reset form
      setStepTitle('');
      setStepDescription('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} step:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} step`,
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
      <DialogContent className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEditMode ? 'Edit Step' : 'Add New Step'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {isEditMode 
                  ? 'Update step details for your task'
                  : 'Enter step details to add to your task'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto px-6 py-6" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Information Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="task_info" className="text-sm font-medium text-foreground">
                  Task
                </label>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold">{taskTitle}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step Information Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="step_title" className="text-sm font-medium text-foreground">
                  Step Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="step_title"
                  placeholder="e.g., Review document, Send email, etc."
                  value={stepTitle}
                  onChange={(e) => setStepTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            <Separator />

            {/* Description Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="step_description" className="text-sm font-medium text-foreground">
                  Description <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <Textarea
                  id="step_description"
                  placeholder="Add more details about this step..."
                  value={stepDescription}
                  onChange={(e) => setStepDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30">
          <div className="flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={!stepTitle.trim() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {isEditMode ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Add Step'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

