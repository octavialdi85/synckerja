import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Progress } from '@/features/ui/progress';
import { Badge } from '@/features/ui/badge';
import { Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { useWeeklyCheckinHistory } from './useWeeklyCheckinHistory';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface WeeklyCheckinHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResultId?: string;
  objectiveId?: string;
  objectiveTitle: string;
  organizationId: string;
  cycleId: string;
}

export const WeeklyCheckinHistoryDialog: React.FC<WeeklyCheckinHistoryDialogProps> = ({
  open,
  onOpenChange,
  keyResultId,
  objectiveId,
  objectiveTitle,
  organizationId,
  cycleId
}) => {
  const [editingRows, setEditingRows] = useState<Record<string, any>>({});
  
  // Use the appropriate hook based on whether we have a keyResultId or objectiveId
  const { data: history = [], isLoading } = keyResultId 
    ? useWeeklyCheckinHistory(keyResultId, organizationId)
    : { data: [], isLoading: false }; // TODO: Add hook for objective-based history

  // Generate week periods (current week + past weeks + future weeks for editing)
  const generateWeekPeriods = () => {
    const periods = [];
    const currentDate = new Date();
    
    // Add future weeks (2 weeks ahead)
    for (let i = 2; i > 0; i--) {
      const futureDate = addWeeks(currentDate, i);
      const start = startOfWeek(futureDate, { weekStartsOn: 6 }); // Saturday
      const end = endOfWeek(futureDate, { weekStartsOn: 6 }); // Friday
      periods.push({
        id: `future-${i}`,
        week_start_date: format(start, 'yyyy-MM-dd'),
        week_end_date: format(end, 'yyyy-MM-dd'),
        isFuture: true,
        label: 'Future'
      });
    }

    // Add current week
    const start = startOfWeek(currentDate, { weekStartsOn: 6 });
    const end = endOfWeek(currentDate, { weekStartsOn: 6 });
    periods.push({
      id: 'current',
      week_start_date: format(start, 'yyyy-MM-dd'),
      week_end_date: format(end, 'yyyy-MM-dd'),
      isCurrent: true,
      label: 'Current'
    });

    // Add past weeks from history
    history.forEach((checkin, index) => {
      const start = new Date(checkin.week_start_date);
      const end = endOfWeek(start, { weekStartsOn: 6 });
      periods.push({
        id: checkin.id,
        week_start_date: checkin.week_start_date,
        week_end_date: format(end, 'yyyy-MM-dd'),
        current_value: checkin.current_value,
        status: checkin.status,
        comments: checkin.comments,
        blockers: checkin.blockers,
        confidence_level: checkin.confidence_level,
        isPast: true
      });
    });

    return periods.sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime());
  };

  const weekPeriods = generateWeekPeriods();

  // Calculate overall progress from real data
  const getProgressData = () => {
    if (keyResultId && history.length > 0) {
      // For key results, get the latest check-in value
      const latestCheckin = history[0]; // History is sorted by date desc
      const currentValue = latestCheckin?.current_value || 0;
      const targetValue = 100; // Default to 100 for percentage-based progress
      return { currentValue, targetValue };
    } else if (objectiveId) {
      // For objectives, calculate from weekly check-ins
      const latestValue = weekPeriods.find(p => p.current_value !== undefined)?.current_value || 0;
      const targetValue = 100; // Objectives are typically percentage-based
      return { currentValue: latestValue, targetValue };
    }
    return { currentValue: 0, targetValue: 100 };
  };

  const { currentValue, targetValue } = getProgressData();
  const progressPercentage = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  const handleRowEdit = (periodId: string, field: string, value: any) => {
    setEditingRows(prev => ({
      ...prev,
      [periodId]: {
        ...prev[periodId],
        [field]: value
      }
    }));
  };

  // Recalculate progress including edited values
  const getUpdatedProgressData = () => {
    if (keyResultId && history.length > 0) {
      // For key results, get the latest check-in value (including edits)
      const latestCheckin = history[0];
      const editedValue = editingRows[latestCheckin?.id]?.current_value;
      const currentValue = editedValue !== undefined ? editedValue : (latestCheckin?.current_value || 0);
      const targetValue = 100; // Default to 100 for percentage-based progress
      return { currentValue, targetValue };
    } else if (objectiveId) {
      // For objectives, get the most recent value including edits
      let latestValue = 0;
      
      // Check current week first (if edited)
      const currentWeekEdit = editingRows['current']?.current_value;
      if (currentWeekEdit !== undefined) {
        latestValue = currentWeekEdit;
      } else {
        // Find the most recent non-future period with a value
        const recentPeriod = weekPeriods.find(p => !p.isFuture && (p.current_value !== undefined || editingRows[p.id]?.current_value !== undefined));
        if (recentPeriod) {
          latestValue = editingRows[recentPeriod.id]?.current_value !== undefined 
            ? editingRows[recentPeriod.id].current_value 
            : (recentPeriod.current_value || 0);
        }
      }
      
      return { currentValue: latestValue, targetValue: 100 };
    }
    return { currentValue: 0, targetValue: 100 };
  };

  // Use updated progress data that includes edits
  const updatedProgress = getUpdatedProgressData();
  const finalCurrentValue = updatedProgress.currentValue;
  const finalTargetValue = updatedProgress.targetValue;
  const finalProgressPercentage = finalTargetValue > 0 ? Math.min((finalCurrentValue / finalTargetValue) * 100, 100) : 0;

  // Debug logging
  console.log('🔍 Progress Debug:', {
    finalCurrentValue,
    finalTargetValue,
    finalProgressPercentage,
    editingRows,
    weekPeriods: weekPeriods.length,
    historyLength: history.length
  });

  const getRowData = (period: any) => {
    return editingRows[period.id] || period;
  };

  const saveAllChanges = async () => {
    if (!organizationId || !keyResultId) {
      console.error('Missing organizationId or keyResultId');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('No authenticated user');
        return;
      }

      // Get current user's employee ID
      const { data: employee } = await (supabase as any)
        .from('employees')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('organization_id', organizationId)
        .single();

      if (!employee || !(employee as any)?.id) {
        console.error('Employee not found');
        return;
      }

      const changedWeeks = Object.entries(editingRows).filter(([_, data]) => 
        data && (data.current_value !== undefined || data.status || data.comments || data.blockers)
      );
      
      if (changedWeeks.length === 0) {
        console.log('No changes to save');
        onOpenChange(false);
        return;
      }

      // Save each changed week
      for (const [periodId, data] of changedWeeks) {
        const period = weekPeriods.find(p => p.id === periodId);
        if (!period || period.isFuture) continue;

        const weekStartDate = period.week_start_date;
        
        // Check if record exists
        const { data: existingCheckin } = await (supabase as any)
          .from('weekly_checkins')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('key_result_id', keyResultId)
          .eq('employee_id', (employee as any).id)
          .eq('week_start_date', weekStartDate)
          .maybeSingle();

        if (existingCheckin && (existingCheckin as any).id) {
          // Update existing check-in
          await (supabase as any)
            .from('weekly_checkins')
            .update({
              current_value: data.current_value || 0,
              confidence_level: 8,
              status: data.status || 'on_track',
              comments: data.comments || '',
              blockers: data.blockers || ''
            })
            .eq('id', (existingCheckin as any).id);
        } else {
          // Create new check-in
          await (supabase as any)
            .from('weekly_checkins')
            .insert({
              organization_id: organizationId,
              key_result_id: keyResultId,
              employee_id: (employee as any).id,
              week_start_date: weekStartDate,
              current_value: data.current_value || 0,
              confidence_level: 8,
              status: data.status || 'on_track',
              comments: data.comments || '',
              blockers: data.blockers || ''
            } as any);
        }
      }

      console.log('All changes saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Weekly Check-in History - {objectiveTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Weekly periods run from Saturday to Friday. Current and past weeks can be edited.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress Overview</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(finalProgressPercentage)} / 100 %
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={isNaN(finalProgressPercentage) ? 0 : finalProgressPercentage} 
                className="h-3 bg-gray-200" 
              />
              {/* Debug: Show a test progress bar */}
              {finalProgressPercentage === 0 && (
                <div className="absolute top-0 left-0 w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: '25%' }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="text-right">
                {finalProgressPercentage === 0 ? '0% Complete (Demo: 25%)' : `${Math.round(finalProgressPercentage)}% Complete`}
              </span>
              <span>100%</span>
            </div>
            
            {/* Debug: Test buttons */}
            {finalProgressPercentage === 0 && (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => handleRowEdit('current', 'current_value', 25)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Test 25%
                </button>
                <button 
                  onClick={() => handleRowEdit('current', 'current_value', 50)}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Test 50%
                </button>
                <button 
                  onClick={() => handleRowEdit('current', 'current_value', 75)}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                >
                  Test 75%
                </button>
              </div>
            )}
          </div>

          {/* Table Header */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted font-medium text-sm">
              <div className="col-span-2">Week Period</div>
              <div className="col-span-1">Progress</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Comments</div>
              <div className="col-span-3">Blockers</div>
              <div className="col-span-2">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {weekPeriods.map((period) => {
                const rowData = getRowData(period);
                const startDate = new Date(period.week_start_date);
                const endDate = new Date(period.week_end_date);

                return (
                  <div key={period.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/50">
                    {/* Week Period */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {format(startDate, 'dd MMM yyyy')} - {format(endDate, 'dd MMM yyyy')}
                        </div>
                        {period.isCurrent && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                        {period.isFuture && (
                          <Badge variant="outline" className="text-xs">Future</Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="col-span-1">
                      {period.isFuture ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={rowData.current_value || 0}
                            onChange={(e) => handleRowEdit(period.id, 'current_value', parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm"
                            min="0"
                          />
                          {period.id === 'current' && (
                            <div className="border border-primary rounded px-2 py-1">
                              <Input
                                type="number"
                                value={rowData.current_value || 0}
                                onChange={(e) => handleRowEdit(period.id, 'current_value', parseInt(e.target.value) || 0)}
                                className="w-12 h-6 text-xs border-0 p-0 text-center bg-transparent"
                                min="0"
                                max="100"
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      {period.isFuture ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <Select
                          value={rowData.status || 'on_track'}
                          onValueChange={(value) => handleRowEdit(period.id, 'status', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_track">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>On Track</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="at_risk">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span>At Risk</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="off_track">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>Off Track</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="col-span-3">
                      {period.isFuture ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <Textarea
                          value={rowData.comments || ''}
                          onChange={(e) => handleRowEdit(period.id, 'comments', e.target.value)}
                          placeholder="Comments..."
                          className="min-h-8 text-xs resize-none"
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Blockers */}
                    <div className="col-span-3">
                      {period.isFuture ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <Textarea
                          value={rowData.blockers || ''}
                          onChange={(e) => handleRowEdit(period.id, 'blockers', e.target.value)}
                          placeholder="Blockers..."
                          className="min-h-8 text-xs resize-none"
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={saveAllChanges} className="bg-purple-600 hover:bg-purple-700">
              Save All Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
