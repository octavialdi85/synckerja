import React, { useState, useEffect } from 'react';
import { Plus, Flag, User, Target } from 'lucide-react';
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
import { useDailyTask } from '../DailyTaskContext';
import { DueDatePicker } from './DueDatePicker';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useIndividualObjectives } from '@/features/1_home/components/HomeOKRDashboard/modal/useIndividualObjectives';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useOkrCycles } from '@/features/1_home/components/HomeOKRDashboard/hooks/useOkrCycles';

export const TaskForm = () => {
  const { addTask } = useDailyTask();
  const { data: employees = [] } = useAvailableEmployees();
  const { data: currentEmployee } = useCurrentEmployee();
  const { organizationId } = useCurrentOrg();
  const { data: cycles = [] } = useOkrCycles(organizationId);
  
  // Get active cycle IDs for current period
  const activeCycleIds = cycles
    .filter(cycle => (cycle as any).is_active === true)
    .map(cycle => cycle.id);
    
  const { data: individualObjectives = [] } = useIndividualObjectives(organizationId, activeCycleIds);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [objectiveId, setObjectiveId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-assign to current employee when component mounts
  useEffect(() => {
    if (currentEmployee && !assignedTo) {
      setAssignedTo((currentEmployee as any).id);
    }
  }, [currentEmployee, assignedTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    // Validate that Individual Objective is selected
    if (!objectiveId) {
      alert('Please select an Individual Objective before creating the task.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        objective_id: objectiveId,
        status: 'pending'
      } as any);

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setAssignedTo('');
      setObjectiveId('');
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-4">
        {/* Task Title */}
        <div className="flex-1">
          <Input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        {/* Priority Selector */}
        <div className="w-32">
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

        {/* Due Date */}
        <div className="w-40">
          <DueDatePicker
            value={dueDate}
            onChange={setDueDate}
            disabled={isSubmitting}
          />
        </div>

        {/* Individual Objective */}
        <div className="w-56">
          <Select value={objectiveId} onValueChange={setObjectiveId} disabled={isSubmitting}>
            <SelectTrigger className="border border-gray-200 rounded-lg">
              <SelectValue placeholder="Select Individual Objective">
                {objectiveId ? (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm truncate">
                      {individualObjectives.find(obj => obj.id === objectiveId)?.title || 'Select...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">Individual Objective</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {individualObjectives.length === 0 ? (
                <SelectItem value="no-objectives" disabled>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">No objectives available</span>
                  </div>
                </SelectItem>
              ) : (
                individualObjectives.map((objective) => (
                  <SelectItem key={objective.id} value={objective.id}>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-48">
                          {objective.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          Individual • {objective.status}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Assign To */}
        <div className="w-48">
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

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!title.trim() || !objectiveId || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </div>
          )}
        </Button>
      </div>

      {/* Description (Optional) */}
      {title && (
        <div className="mt-3">
          <Textarea
            placeholder="Add description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>
      )}
    </form>
  );
};





