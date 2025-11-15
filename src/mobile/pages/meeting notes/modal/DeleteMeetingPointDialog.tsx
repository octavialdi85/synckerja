import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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

interface MeetingPoint {
  id: string;
  discussion_point: string;
}

interface DeleteMeetingPointDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingPoint: MeetingPoint | null;
  onDeleteSuccess: (id: string) => Promise<void>;
}

const DeleteMeetingPointDialog = ({ 
  isOpen, 
  onClose, 
  meetingPoint,
  onDeleteSuccess 
}: DeleteMeetingPointDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!meetingPoint?.id) return;

    setIsDeleting(true);
    
    try {
      await onDeleteSuccess(meetingPoint.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-none w-screen h-auto md:w-auto md:max-w-md border-none bg-card p-0 shadow-xl focus:outline-none flex flex-col m-0 rounded-none md:rounded-lg translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] left-0 top-0 md:left-[50%] md:top-[50%]">
        <div className="px-4 py-4 md:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Meeting Point
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground break-words">
              Are you sure you want to delete this meeting point? This action cannot be undone.
              {meetingPoint && (
                <div className="mt-2 p-2 bg-muted rounded text-sm break-words">
                  <strong>Discussion Point:</strong> {meetingPoint.discussion_point}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={onClose} disabled={isDeleting} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMeetingPointDialog;















