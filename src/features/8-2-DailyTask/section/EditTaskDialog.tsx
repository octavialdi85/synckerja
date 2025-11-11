import React, { useState, useEffect } from 'react';
import { X, Flag, User } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { useDailyTask } from '../DailyTaskContext';
import { DueDatePicker } from './DueDatePicker';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
}

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({ isOpen, onClose, taskId }) => {
  const { tasks, updateTask } = useDailyTask();
  const { data: employees = [] } = useAvailableEmployees();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [dueDate, setDueDate] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Load task data when dialog opens
  useEffect(() => {
    if (isOpen && taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setPriority(task.priority || 'medium');
        setStatus(task.status || 'pending');
        setDueDate(task.due_date || '');
        setAssignedTo(task.assigned_to || '');
      }
    }
  }, [isOpen, taskId, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !taskId) return;

    setIsSubmitting(true);
    try {
      await updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        status: status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
      });

      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen md:w-[600px] md:h-[600px] md:max-w-[600px] border-none bg-card p-0 shadow-xl focus:outline-none flex flex-col m-0 rounded-none md:rounded-lg translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] left-0 top-0 md:left-[50%] md:top-[50%]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Edit Task
            </DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              placeholder="Add description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                <SelectTrigger className="border border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-green-600" />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-blue-600" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-orange-600" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-red-600" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
                <SelectTrigger className="border border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <DueDatePicker
                value={dueDate}
                onChange={setDueDate}
                disabled={isSubmitting}
              />
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To
              </label>
              <Select value={assignedTo || 'unassigned'} onValueChange={(value) => setAssignedTo(value === 'unassigned' ? '' : value)} disabled={isSubmitting}>
                <SelectTrigger className="border border-gray-200 rounded-lg">
                  <SelectValue placeholder="Assign to...">
                    {assignedTo && assignedTo !== 'unassigned' ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {employees.find(e => e.id === assignedTo)?.full_name || 'Select...'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500 text-sm">Assign to...</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Unassigned
                    </div>
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        {employee.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </form>
        </div>
        
        {/* Action Buttons - Fixed at bottom right */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 md:px-6 md:py-3 border-t bg-white mt-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (formRef.current) {
                formRef.current.requestSubmit();
              }
            }}
            disabled={!title.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

