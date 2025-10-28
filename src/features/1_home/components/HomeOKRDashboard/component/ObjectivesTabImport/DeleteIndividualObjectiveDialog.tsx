import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';
import { useDeleteIndividualObjective } from '../../modal/useIndividualObjectives';

interface DeleteIndividualObjectiveDialogProps {
  objective: {
    id: string;
    title: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteIndividualObjectiveDialog = ({ 
  objective, 
  isOpen, 
  onClose
}: DeleteIndividualObjectiveDialogProps) => {
  const deleteObjective = useDeleteIndividualObjective();

  const handleConfirm = () => {
    if (!objective) return;
    
    console.log('🗑️ Confirming deletion of objective:', objective.id, objective.title);
    
    deleteObjective.mutate(objective.id, {
      onSuccess: () => {
        console.log('✅ Objective deleted successfully');
        onClose();
      },
      onError: (error) => {
        console.error('❌ Failed to delete objective:', error);
      }
    });
  };

  if (!objective) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Individual Objective</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{objective.title}"? This action cannot be undone and will also remove all associated activities and progress data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteObjective.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteObjective.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
