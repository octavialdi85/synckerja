import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';

interface MobileDueDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dueDate: string) => void;
  taskTitle: string;
  taskType: 'task' | 'step' | 'substep';
  isLoading?: boolean;
}

export const MobileDueDateDialog: React.FC<MobileDueDateDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  taskTitle,
  taskType,
  isLoading = false
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('23:59');

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      // Set default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTime('23:59');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedDate) return;

    // Combine date and time
    const dueDateString = `${selectedDate}T${selectedTime}:00`;
    const dueDate = new Date(dueDateString);
    
    onConfirm(dueDate.toISOString());
  };

  const getTaskTypeLabel = () => {
    switch (taskType) {
      case 'task':
        return 'Task';
      case 'step':
        return 'Step';
      case 'substep':
        return 'Sub-Step';
      default:
        return 'Item';
    }
  };

  const isValidDate = selectedDate && new Date(selectedDate) >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-none h-full max-h-screen m-0 rounded-none fixed inset-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:max-w-[500px] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Set Due Date
          </DialogTitle>
          <DialogDescription>
            Set a deadline for completing this {getTaskTypeLabel().toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {/* Task Title Display */}
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-1">
              {getTaskTypeLabel()}
            </div>
            <div className="text-sm font-medium text-gray-900 line-clamp-2">
              {taskTitle}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="mobile-due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Due Date
            </Label>
            <Input
              id="mobile-due-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="mobile-due-time" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Due Time
            </Label>
            <Input
              id="mobile-due-time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Preview */}
          {selectedDate && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-xs font-medium text-blue-700 mb-1">
                Deadline Preview
              </div>
              <div className="text-sm font-semibold text-blue-900">
                {new Date(`${selectedDate}T${selectedTime}`).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValidDate || isLoading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <span className="mr-2">⏳</span>
                Taking Task...
              </>
            ) : (
              <>
                <span className="mr-2">✓</span>
                Confirm & Take Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

