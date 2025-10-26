import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
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
    setNewDeadline(undefined);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Deadline Extension</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentDeadline && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Deadline</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {format(new Date(currentDeadline), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newDeadline" className="text-sm font-medium">
              New Deadline
            </Label>
            <div className="border rounded-md p-2">
              <CustomDatePicker
                selected={newDeadline}
                onSelect={setNewDeadline}
                className="border-0 shadow-none"
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
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newDeadline || !reason.trim() || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Submitting...' : 'Request Extension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
