import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CustomDatePicker } from '@/features/share/calendar';

interface DeadlineExtensionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  currentDeadline: string | null;
  onRequestExtension: (taskId: string, newDeadline: string, reason: string) => Promise<void>;
}

export const DeadlineExtensionDialog: React.FC<DeadlineExtensionDialogProps> = ({
  isOpen,
  onClose,
  taskId,
  currentDeadline,
  onRequestExtension
}) => {
  const [newDeadline, setNewDeadline] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill highlight date when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (currentDeadline) {
        const base = new Date(currentDeadline);
        base.setDate(base.getDate() + 1);
        setNewDeadline(base);
      } else {
        setNewDeadline(new Date());
      }
    } else {
      setNewDeadline(undefined);
      setReason('');
    }
  }, [isOpen, currentDeadline]);

  const handleSubmit = async () => {
    if (!taskId || !newDeadline || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onRequestExtension(taskId, newDeadline.toISOString(), reason.trim());
      handleClose();
    } catch (error) {
      console.error('Error requesting deadline extension:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="w-[520px] max-w-[90vw] max-h-[85vh] h-[560px] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Request Deadline Extension</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a new deadline and tell us why you need extra time.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
          style={{
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {currentDeadline && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Deadline</Label>
              <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-800">
                  {format(new Date(currentDeadline), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newDeadline" className="text-sm font-medium">
              New Deadline
            </Label>
            <div className="border border-gray-200 rounded-lg p-3 bg-white">
              <CustomDatePicker
                selected={newDeadline}
                onSelect={setNewDeadline}
                className="border-0 shadow-none p-0"
                disabled={(date) => {
                  if (!currentDeadline) return false;
                  return date < new Date(currentDeadline);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Extension
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need a deadline extension..."
              rows={4}
              className="resize-none border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newDeadline || !reason.trim() || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 min-w-[150px]"
          >
            {isSubmitting ? 'Submitting...' : 'Request Extension'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
