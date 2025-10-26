
import { useState, useEffect } from 'react';
import { History, Clock, User, Plus, X, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { ScrollArea } from '@/features/ui/scroll-area';
import { useMeetingNotes } from '../MeetingNotesContext';

interface UpdateHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  discussionPoint: string;
  meetingPointId: string;
}

const UpdateHistoryDialog = ({ isOpen, onClose, discussionPoint, meetingPointId }: UpdateHistoryDialogProps) => {
  const { getUpdateHistory, addUpdate, updateUpdate, deleteUpdate } = useMeetingNotes();
  const [updateHistory, setUpdateHistory] = useState<any[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (isOpen && meetingPointId) {
      loadUpdateHistory();
    }
  }, [isOpen, meetingPointId]);

  const loadUpdateHistory = async () => {
    setIsLoading(true);
    try {
      const history = await getUpdateHistory(meetingPointId);
      setUpdateHistory(history);
    } catch (error) {
      console.error('Error loading update history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;

    setIsSubmitting(true);
    try {
      const statusToSet = newStatus || 'On Going';
      await addUpdate(meetingPointId, newUpdate, statusToSet);
      
      // Reload the update history to show the new update
      await loadUpdateHistory();
      
      setNewUpdate('');
      setNewStatus('');
    } catch (error) {
      console.error('Error adding update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleEditUpdate = (updateId: string, currentText: string) => {
    setEditingUpdateId(updateId);
    setEditingText(currentText);
  };

  const handleSaveEdit = async (updateId: string) => {
    if (!editingText.trim()) return;

    try {
      await updateUpdate(updateId, editingText);
      
      // Reload update history
      await loadUpdateHistory();
      setEditingUpdateId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingUpdateId(null);
    setEditingText('');
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!window.confirm('Are you sure you want to delete this update?')) {
      return;
    }

    try {
      await deleteUpdate(updateId);
      
      // Reload update history
      await loadUpdateHistory();
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <History className="w-5 h-5 text-blue-600" />
                Update History
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 font-medium">
                {discussionPoint}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-6 pt-4">
          {/* Add New Update Section */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Progress Update
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-update" className="text-sm font-medium text-gray-700 mb-2 block">
                  Update Details
                </Label>
                <Textarea
                  id="new-update"
                  placeholder="Describe the progress or changes made..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  className="min-h-[80px] resize-none bg-white border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="status-update" className="text-sm font-medium text-gray-700 mb-2 block">
                    Update Status (Optional)
                  </Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-white border border-gray-200 focus:border-blue-300">
                      <SelectValue placeholder="Keep current status or change..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg">
                      <SelectItem value="On Going">On Going</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Presented">Presented</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddUpdate}
                  disabled={!newUpdate.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium"
                >
                  {isSubmitting ? 'Adding...' : 'Add Update'}
                </Button>
              </div>
            </div>
          </div>

          {/* Update History Section */}
          <div className="flex-1 overflow-hidden">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              Update History ({updateHistory.length})
            </h4>
            
            <ScrollArea className="h-full max-h-[400px]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading update history...
                  </div>
                ) : updateHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">No updates yet</p>
                    <p className="text-sm">Add the first update above to get started.</p>
                  </div>
                ) : (
                  updateHistory.map((update, index) => (
                    <div 
                      key={update.id} 
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          <span className="font-medium">System Update</span>
                          {index === 0 && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono">
                            {formatDateTime(update.created_at)}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUpdate(update.id, update.update_details)}
                              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit update"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                              title="Delete update"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {editingUpdateId === update.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[80px] resize-none bg-white border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleSaveEdit(update.id)}
                              disabled={!editingText.trim()}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">
                          {update.update_details}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateHistoryDialog;
