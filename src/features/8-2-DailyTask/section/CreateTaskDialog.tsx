import React, { useState } from 'react';
import { Plus, Flag, User, Target, UserPlus, X } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
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
  DialogDescription,
} from '@/features/ui/dialog';
import { useDailyTask } from '../DailyTaskContext';
import { AssignTaskModal } from './AssignTaskModal';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useIndividualObjectives } from '@/features/1_home/components/HomeOKRDashboard/modal/useIndividualObjectives';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useOkrCycles } from '@/features/1_home/components/HomeOKRDashboard/hooks/useOkrCycles';
import { ObjectiveHierarchyDialog } from '../modal/ObjectiveHierarchyDialog';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onOpenChange,
}) => {
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
  const [objectiveId, setObjectiveId] = useState<string>('');
  const [objectiveContext, setObjectiveContext] = useState<{
    companyTitle?: string;
    departmentTitle?: string;
    individualTitle: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isObjectiveDialogOpen, setIsObjectiveDialogOpen] = useState(false);
  
  // Assignment state - will be set via modal
  const [assignment, setAssignment] = useState<{
    employeeId: string | null;
    deadline: string | null;
  }>({
    employeeId: null,
    deadline: null
  });
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssign = (newAssignment: { employeeId: string | null; deadline: string | null }) => {
    setAssignment(newAssignment);
  };

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
        due_date: assignment.deadline || null,
        assigned_to: assignment.employeeId || null,
        objective_id: objectiveId,
        status: 'pending'
      } as any);

      // Reset form and close dialog
      setTitle('');
      setDescription('');
      setPriority('medium');
      setObjectiveId('');
      setObjectiveContext(null);
      setAssignment({ employeeId: null, deadline: null });
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle('');
    setDescription('');
    setPriority('medium');
    setObjectiveId('');
    setObjectiveContext(null);
    setAssignment({ employeeId: null, deadline: null });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto seamless-scroll">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Create New Task
            </DialogTitle>
            <DialogDescription>
              Create a new task and link it to an individual objective. Fill in all required fields to save.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Add description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            {/* Priority and Objective Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority Selector */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority <span className="text-red-500">*</span>
                </Label>
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

              {/* Individual Objective */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Individual Objective <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsObjectiveDialogOpen(true)}
                  disabled={isSubmitting}
                  className="w-full justify-start border border-gray-200 rounded-lg hover:bg-gray-50 h-10"
                >
                  {objectiveId && objectiveContext ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1 text-left">
                        <span className="text-sm truncate font-medium text-gray-900">
                          {objectiveContext.individualTitle}
                        </span>
                        {(objectiveContext.companyTitle || objectiveContext.departmentTitle) && (
                          <span className="text-xs text-gray-500 truncate">
                            {objectiveContext.companyTitle && objectiveContext.departmentTitle
                              ? `${objectiveContext.companyTitle} → ${objectiveContext.departmentTitle}`
                              : objectiveContext.companyTitle || objectiveContext.departmentTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 text-sm">Select Individual Objective</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Assign Button */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignment</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignModal(true)}
                disabled={isSubmitting}
                className="w-full justify-start border border-gray-200 rounded-lg hover:bg-gray-50 h-10"
              >
                {assignment.employeeId ? (
                  <div className="flex items-center gap-2 w-full">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm truncate flex-1 text-left">
                      {employees.find(e => e.id === assignment.employeeId)?.full_name || 'Assigned'}
                    </span>
                    {assignment.deadline && (
                      <span className="text-xs text-gray-500">
                        {new Date(assignment.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">Assign Task (Optional)</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
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
                    Create Task
                  </div>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Task Modal */}
      <AssignTaskModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        onAssign={handleAssign}
        currentAssignment={assignment}
      />

      {/* Objective Hierarchy Dialog */}
      <ObjectiveHierarchyDialog
        open={isObjectiveDialogOpen}
        onOpenChange={setIsObjectiveDialogOpen}
        onSelect={(id, context) => {
          setObjectiveId(id);
          setObjectiveContext(context);
        }}
        selectedObjectiveId={objectiveId}
        organizationId={organizationId || ''}
        cycleIds={activeCycleIds}
      />
    </>
  );
};

