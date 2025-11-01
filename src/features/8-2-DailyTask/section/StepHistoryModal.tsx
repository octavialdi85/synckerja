import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/features/ui/dialog';
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
import { Badge } from '@/features/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { 
  History, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Flag, 
  MessageSquare, 
  Calendar,
  User,
  Zap,
  Target,
  FileText,
  AlertCircle,
  Info,
  XCircle,
  CheckSquare,
  GitBranch
} from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StepDependencyModal } from './StepDependencyModal';

interface StepHistory {
  id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  blocker_type: string | null;
  blocker_severity: string | null;
  brief_type: string | null;
  created_at: string;
  created_by: string;
  created_by_employee?: { id: string; full_name: string; email?: string };
}

interface StepHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskStepId: string;
  stepTitle: string;
  currentStatus: string;
  currentPriority: string;
  taskId?: string;
  subStepId?: string; // when provided, operate on sub-step history instead
  onHistoryUpdate?: () => void;
}

export const StepHistoryModal: React.FC<StepHistoryModalProps> = ({
  isOpen,
  onClose,
  taskStepId,
  stepTitle,
  currentStatus,
  currentPriority,
  taskId,
  subStepId,
  onHistoryUpdate
}) => {
  const [activeTab, setActiveTab] = useState('brief');
  const [history, setHistory] = useState<StepHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  
  // Blocker form state
  const [blockerType, setBlockerType] = useState('');
  const [blockerSeverity, setBlockerSeverity] = useState('');
  const [blockerDescription, setBlockerDescription] = useState('');
  
  // Brief form state
  const [briefType, setBriefType] = useState('');
  const [briefDescription, setBriefDescription] = useState('');
  
  // Status update form state
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [statusDescription, setStatusDescription] = useState('');
  
  // Priority update form state
  const [newPriority, setNewPriority] = useState(currentPriority);
  const [priorityDescription, setPriorityDescription] = useState('');
  
  const { toast } = useToast();

  const fetchHistory = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const base = (supabase as any)
        .from('task_step_history')
        .select('*')
        .order('created_at', { ascending: false });

      // OPTIMIZATION: Add timeout protection (5 seconds)
      const historyPromise = subStepId
        ? base.eq('task_steps_to_steps_id', subStepId)
        : base.eq('task_step_id', taskStepId);

      const { data, error } = await Promise.race([
        historyPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('History fetch timeout')), 5000)
        )
      ]) as any;

      if (error) throw error;
      
      // Get unique user IDs from history
      const userIds = [...new Set((data || []).map((entry: any) => entry.created_by).filter(Boolean))];
      
      // Fetch employee data for these user IDs
      let employeesData = {};
      if (userIds.length > 0) {
        const { data: employees, error: empError } = await (supabase as any)
          .from('employees')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        if (empError) {
          console.warn('Failed to fetch employees:', empError);
        } else {
          employeesData = employees?.reduce((acc: any, emp: any) => {
            acc[emp.user_id] = emp;
            return acc;
          }, {}) || {};
        }
      }

      // Add employee data to history entries
      const historyWithEmployees = (data || []).map((entry: any) => ({
        ...entry,
        created_by_employee: employeesData[entry.created_by] || null
      }));

      setHistory(historyWithEmployees);
    } catch (error: any) {
      console.error('Error fetching step history:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch step history: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isOpen, taskStepId, subStepId]);

  const addHistoryEntry = async (actionType: string, data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertPayload: any = {
        action_type: actionType,
        ...data,
        created_by: user.id,
      };
      if (subStepId) {
        insertPayload.task_steps_to_steps_id = subStepId;
        insertPayload.task_step_id = taskStepId; // always record parent step id for sub-step history
      } else {
        insertPayload.task_step_id = taskStepId;
      }

      const { error } = await (supabase as any)
        .from('task_step_history')
        .insert(insertPayload);

      if (error) throw error;

      // Update step status if needed
      if (!subStepId) {
        if (actionType === 'status_change') {
          const { error: updateError } = await (supabase as any)
            .from('task_steps')
            .update({
              status: newStatus,
              blocked_reason: newStatus === 'blocked' ? data.description : null,
              blocked_at: newStatus === 'blocked' ? new Date().toISOString() : null,
              started_at: newStatus === 'in_progress' ? new Date().toISOString() : null,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            })
            .eq('id', taskStepId);

          if (updateError) throw updateError;
        }

        // Update step priority if needed
        if (actionType === 'priority_change') {
          const { error: updateError } = await (supabase as any)
            .from('task_steps')
            .update({ priority: newPriority })
            .eq('id', taskStepId);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: 'Success',
        description: 'Update recorded successfully!',
      });

      fetchHistory();
      onHistoryUpdate?.();
    } catch (error: any) {
      console.error('Error adding history entry:', error);
      toast({
        title: 'Error',
        description: `Failed to record update: ${error.message}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleBlockerSubmit = async () => {
    if (!blockerType || !blockerSeverity || !blockerDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all blocker fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await addHistoryEntry('blocker_added', {
        description: blockerDescription.trim(),
        blocker_type: blockerType,
        blocker_severity: blockerSeverity
      });

      // Reset form
      setBlockerType('');
      setBlockerSeverity('');
      setBlockerDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBriefSubmit = async () => {
    if (!briefType || !briefDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all brief fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await addHistoryEntry('brief_update', {
        description: briefDescription.trim(),
        brief_type: briefType
      });

      // Reset form
      setBriefType('');
      setBriefDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!statusDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description for the status change',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await addHistoryEntry('status_change', {
        old_value: currentStatus,
        new_value: newStatus,
        description: statusDescription.trim()
      });

      // Reset form
      setStatusDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrioritySubmit = async () => {
    if (!priorityDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description for the priority change',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await addHistoryEntry('priority_change', {
        old_value: currentPriority,
        new_value: newPriority,
        description: priorityDescription.trim()
      });

      // Reset form
      setPriorityDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'blocker_added': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'blocker_resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'status_change': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'priority_change': return <Flag className="w-4 h-4 text-orange-500" />;
      case 'brief_update': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'comment_added': return <MessageSquare className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'bg-green-100 text-green-700 border-green-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      critical: 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <Badge className={`${variants[severity as keyof typeof variants] || ''} px-2 py-1 text-xs`}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      blocked: 'bg-red-100 text-red-700 border-red-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return (
      <Badge className={`${variants[status as keyof typeof variants] || ''} px-2 py-1 text-xs`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Step History & Updates
          </DialogTitle>
          <DialogDescription>
            Manage blockers, briefs, and track progress for "{stepTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="brief" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Brief Updates
              </TabsTrigger>
              <TabsTrigger value="blocker" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Blockers
              </TabsTrigger>
            {!subStepId && (
            <TabsTrigger value="status" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Status
            </TabsTrigger>
            )}
            {!subStepId && (
            <TabsTrigger value="dependencies" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Dependencies
            </TabsTrigger>
            )}
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="blocker" className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Report Blocker
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="blockerType">Blocker Type</Label>
                      <Select value={blockerType} onValueChange={setBlockerType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blocker type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="resource">Resource Unavailable</SelectItem>
                          <SelectItem value="approval">Pending Approval</SelectItem>
                          <SelectItem value="dependency">Dependency Issue</SelectItem>
                          <SelectItem value="external">External Factor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="blockerSeverity">Severity</Label>
                      <Select value={blockerSeverity} onValueChange={setBlockerSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="blockerDescription">Description</Label>
                    <Textarea
                      id="blockerDescription"
                      value={blockerDescription}
                      onChange={(e) => setBlockerDescription(e.target.value)}
                      placeholder="Describe the blocker in detail..."
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleBlockerSubmit} 
                    disabled={submitting}
                    className="mt-4 bg-red-600 hover:bg-red-700"
                  >
                    {submitting ? 'Reporting...' : 'Report Blocker'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="brief" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Brief Update
                  </h3>
                  <div className="mb-4">
                    <Label htmlFor="briefType">Update Type</Label>
                    <Select value={briefType} onValueChange={setBriefType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select update type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="progress_update">Progress Update</SelectItem>
                        <SelectItem value="requirement_change">Requirement Change</SelectItem>
                        <SelectItem value="scope_adjustment">Scope Adjustment</SelectItem>
                        <SelectItem value="timeline_update">Timeline Update</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="briefDescription">Update Details</Label>
                    <Textarea
                      id="briefDescription"
                      value={briefDescription}
                      onChange={(e) => setBriefDescription(e.target.value)}
                      placeholder="Provide detailed update information..."
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleBriefSubmit} 
                    disabled={submitting}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? 'Updating...' : 'Update Brief'}
                  </Button>
                </div>
              </TabsContent>

              {!subStepId && (
              <TabsContent value="status" className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Update Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newStatus">New Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="newPriority">Priority</Label>
                      <Select value={newPriority} onValueChange={setNewPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="statusDescription">Description</Label>
                    <Textarea
                      id="statusDescription"
                      value={statusDescription}
                      onChange={(e) => setStatusDescription(e.target.value)}
                      placeholder="Describe the status change..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={handleStatusSubmit} 
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? 'Updating...' : 'Update Status'}
                    </Button>
                    <Button 
                      onClick={handlePrioritySubmit} 
                      disabled={submitting}
                      variant="outline"
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      {submitting ? 'Updating...' : 'Update Priority'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              )}

              {!subStepId && (
              <TabsContent value="dependencies" className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Step Dependencies
                  </h3>
                  <p className="text-sm text-purple-700 mb-4">
                    Manage dependencies between steps to ensure proper execution order and workflow.
                  </p>
                  <Button 
                    onClick={() => setShowDependencyModal(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Manage Dependencies
                  </Button>
                </div>
              </TabsContent>
              )}

              <TabsContent value="history" className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Activity Timeline
                  </h3>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading history...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                          <div className="flex-shrink-0 mt-1">
                            {getActionIcon(entry.action_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {entry.action_type.replace('_', ' ').toUpperCase()}
                              </span>
                              {entry.blocker_severity && getSeverityBadge(entry.blocker_severity)}
                              {entry.new_value && entry.action_type === 'status_change' && getStatusBadge(entry.new_value)}
                            </div>
                            {entry.description && (
                              <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {entry.created_by_employee?.full_name || 'Unknown User'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>

        {/* Dependency Modal */}
        {showDependencyModal && (
          <StepDependencyModal
            isOpen={showDependencyModal}
            onClose={() => setShowDependencyModal(false)}
            taskStepId={taskStepId}
            stepTitle={stepTitle}
            taskId={taskId}
            onDependencyUpdate={() => {
              // Refresh data if needed
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
