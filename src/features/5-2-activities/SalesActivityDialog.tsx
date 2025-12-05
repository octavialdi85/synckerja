
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { SalesActivityForm } from './SalesActivityForm';

interface SalesActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  activity?: any;
}

export const SalesActivityDialog = ({ open, onOpenChange, onSuccess, activity }: SalesActivityDialogProps) => {
  const handleSuccess = () => {
    onSuccess();
    // Close dialog after successful creation
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit Sales Activity' : 'Add New Sales Activity'}</DialogTitle>
        </DialogHeader>
        <SalesActivityForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          activity={activity}
        />
      </DialogContent>
    </Dialog>
  );
};
