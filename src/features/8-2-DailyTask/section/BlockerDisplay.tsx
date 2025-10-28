import React, { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Badge } from '@/features/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/features/ui/dialog';
import { 
  AlertTriangle, 
  Calendar, 
  User, 
  Clock, 
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Blocker {
  id: string;
  task_step_id: string;
  description: string;
  blocker_type: string;
  blocker_severity: string;
  created_at: string;
  created_by: string;
  created_by_employee?: { id: string; full_name: string; email?: string };
  step_title: string;
  task_title: string;
}

interface BlockerDisplayProps {
  weekStart: string; // Format: "2025-10-24"
  weekEnd: string;   // Format: "2025-10-30"
  organizationId: string;
  objectiveId?: string; // Optional objective ID filter
  onBlockerUpdate?: () => void;
}

export const BlockerDisplay: React.FC<BlockerDisplayProps> = ({
  weekStart,
  weekEnd,
  organizationId,
  objectiveId,
  onBlockerUpdate
}) => {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filteredBlockers, setFilteredBlockers] = useState<Blocker[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { toast } = useToast();

  const fetchBlockers = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // First, get the blockers data
      let query = (supabase as any)
        .from('task_step_history')
        .select(`
          id,
          task_step_id,
          description,
          blocker_type,
          blocker_severity,
          created_at,
          created_by,
          task_steps!inner(
            title,
            daily_tasks!inner(
              title,
              organization_id,
              objective_id
            )
          )
        `)
        .eq('action_type', 'blocker_added')
        .eq('task_steps.daily_tasks.organization_id', organizationId)
        .gte('created_at', `${weekStart}T00:00:00.000Z`)
        .lte('created_at', `${weekEnd}T23:59:59.999Z`);

      // Add objective filter if provided
      if (objectiveId) {
        query = query.eq('task_steps.daily_tasks.objective_id', objectiveId);
      }

      const { data: blockersData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('🔍 Raw blocker data:', blockersData);

      // Get unique user IDs from blockers
      const userIds = [...new Set(blockersData?.map((blocker: any) => blocker.created_by).filter(Boolean))];
      
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

      console.log('🔍 Employees data:', employeesData);

      const formattedBlockers = (blockersData || []).map((blocker: any) => ({
        id: blocker.id,
        task_step_id: blocker.task_step_id,
        description: blocker.description,
        blocker_type: blocker.blocker_type,
        blocker_severity: blocker.blocker_severity,
        created_at: blocker.created_at,
        created_by: blocker.created_by,
        created_by_employee: employeesData[blocker.created_by] || null,
        step_title: blocker.task_steps?.title || 'Unknown Step',
        task_title: blocker.task_steps?.daily_tasks?.title || 'Unknown Task'
      }));

      console.log('🔍 Formatted blockers:', formattedBlockers);

      setBlockers(formattedBlockers);
    } catch (error: any) {
      console.error('Error fetching blockers:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch blockers: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockers();
  }, [weekStart, weekEnd, organizationId, objectiveId]);

  useEffect(() => {
    let filtered = blockers;

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(blocker => blocker.blocker_severity === selectedSeverity);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(blocker => blocker.blocker_type === selectedType);
    }

    if (searchTerm !== '') {
      filtered = filtered.filter(blocker => 
        blocker.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blocker.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blocker.step_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBlockers(filtered);
  }, [blockers, selectedSeverity, selectedType, searchTerm]);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'technical': return '🔧';
      case 'resource': return '👥';
      case 'approval': return '✅';
      case 'dependency': return '🔗';
      case 'external': return '🌐';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  return (
    <div className="space-y-2">
      {/* Blocker Summary - Only show button if there are blockers */}
      {blockers.length > 0 ? (
        <div className="w-full">
          <Button
            variant="outline"
            onClick={() => setShowModal(true)}
            className="w-full h-9 px-3 text-sm text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300 justify-between"
          >
            <span>Found {blockers.length} Blocker{blockers.length > 1 ? 's' : ''}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="w-full h-9 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50 flex items-center">
          No blockers found for this week period.
        </div>
      )}

      {/* Blocker Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Blockers Report
            </DialogTitle>
            <DialogDescription>
              Week Period: {new Date(weekStart).toLocaleDateString('id-ID')} - {new Date(weekEnd).toLocaleDateString('id-ID')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {/* Filters and Search */}
            <div className="flex flex-wrap gap-2 items-center mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <input
                type="text"
                placeholder="Search blockers, tasks, steps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] h-8 px-2 text-sm border border-gray-300 rounded-md"
              />
              
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="h-8 px-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-8 px-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Types</option>
                <option value="technical">Technical</option>
                <option value="resource">Resource</option>
                <option value="approval">Approval</option>
                <option value="dependency">Dependency</option>
                <option value="external">External</option>
                <option value="other">Other</option>
              </select>
              
              <div className="text-sm text-gray-600">
                Showing {filteredBlockers.length} of {blockers.length} blockers
              </div>
            </div>

            {/* Blockers List */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading blockers...</p>
                </div>
              ) : filteredBlockers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No blockers found for the selected filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBlockers.map((blocker, index) => (
                    <div key={blocker.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            #{index + 1}
                          </span>
                          {getSeverityBadge(blocker.blocker_severity)}
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-2 py-1 text-xs">
                            {getTypeIcon(blocker.blocker_type)} {blocker.blocker_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(blocker.created_at)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">{blocker.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {blocker.task_title}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {blocker.step_title}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {blocker.created_by_employee?.full_name || 'Unknown User'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                fetchBlockers();
                onBlockerUpdate?.();
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
