import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Calendar, CheckCircle, Target, Lock, Save, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import { useProfile } from '../useProfile';
import { useCurrentUserEmployee } from '@/features/1_home/components/HomeOKRDashboard/component/SectionGreetingsImport/useCurrentUserEmployee';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Badge } from '@/features/ui/badge';
import { Progress } from '@/features/ui/progress';
import { ActivitiesTab } from '../DepartmentObjectivesViewImport/ActivitiesTab';
interface WeeklyPeriod {
  weekStart: Date;
  weekEnd: Date;
  displayText: string;
  isCurrentWeek: boolean;
  isEditable: boolean;
  isFuture: boolean;
}
interface CheckinData {
  id?: string;
  progress_percentage: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  comments: string;
  blockers: string;
  hasChanges: boolean;
}
interface ObjectiveCheckinFormProps {
  trigger?: React.ReactNode;
  objectiveId: string;
  objectiveTitle: string;
  onSuccess?: () => void;
}
export const ObjectiveCheckinForm = ({
  trigger,
  objectiveId,
  objectiveTitle,
  onSuccess
}: ObjectiveCheckinFormProps) => {
  const {
    data: profile
  } = useProfile();
  const {
    data: employee
  } = useCurrentUserEmployee();
  const {
    toast
  } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [weeklyPeriods, setWeeklyPeriods] = useState<WeeklyPeriod[]>([]);
  const [checkinData, setCheckinData] = useState<Record<string, CheckinData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cycleData, setCycleData] = useState<{
    start_date: string;
    end_date: string;
  } | null>(null);
  const [keyResultData, setKeyResultData] = useState<{
    target_value: number;
    current_value: number;
    unit: string;
    id: string;
  } | null>(null);

  // Load OKR cycle data
  const loadCycleData = async () => {
    if (!profile?.active_organization_id) return;
    try {
      // Try to get objective from the three hierarchy tables
      let objective;

      // First try company_objectives
      const {
        data: objFromCompany,
        error: objFromCompanyError
      } = await supabase.from('company_objectives').select('cycle_id').eq('id', objectiveId).single();
      if (!objFromCompanyError && objFromCompany) {
        objective = objFromCompany;
      } else {
        // Try department_objectives
        const {
          data: objFromDept,
          error: objFromDeptError
        } = await supabase.from('department_objectives').select('cycle_id').eq('id', objectiveId).single();
        if (!objFromDeptError && objFromDept) {
          objective = objFromDept;
        } else {
          // Try individual_objectives
          const {
            data: objFromIndiv,
            error: objFromIndivError
          } = await supabase.from('individual_objectives').select('cycle_id').eq('id', objectiveId).single();
          if (!objFromIndivError && objFromIndiv) {
            objective = objFromIndiv;
          } else {
            console.error('Error loading objective from all tables:', objFromCompanyError, objFromDeptError, objFromIndivError);
            return;
          }
        }
      }

      // Then get the cycle data
      const {
        data: cycle,
        error: cycleError
      } = await supabase.from('okr_cycles').select('start_date, end_date').eq('id', objective.cycle_id).single();
      if (cycleError || !cycle) {
        console.error('Error loading cycle:', cycleError);
        return;
      }
      setCycleData(cycle);
    } catch (error) {
      console.error('Error loading cycle data:', error);
    }
  };

  // Generate weekly periods based on cycle dates (Saturday to Friday)
  const generateWeeklyPeriods = (): WeeklyPeriod[] => {
    if (!cycleData) return [];
    const periods: WeeklyPeriod[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cycleStart = new Date(cycleData.start_date);
    const cycleEnd = new Date(cycleData.end_date);

    // Find the first Saturday on or before cycle start
    let currentSaturday = new Date(cycleStart);
    const dayOfWeek = currentSaturday.getDay(); // 0 = Sunday, 6 = Saturday
    const daysToSaturday = dayOfWeek === 0 ? 1 : (7 - dayOfWeek + 6) % 7; // Days to go back to Saturday
    currentSaturday.setDate(cycleStart.getDate() - daysToSaturday);
    currentSaturday.setHours(0, 0, 0, 0);

    // Generate all weeks from cycle start to cycle end
    while (currentSaturday <= cycleEnd) {
      const weekStart = new Date(currentSaturday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const isCurrentWeek = today >= weekStart && today <= weekEnd;
      const isFuture = weekStart > today;
      const isEditable = weekStart <= today; // Only current and past weeks are editable, future weeks are locked

      periods.push({
        weekStart,
        weekEnd,
        displayText: `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleDateString('id-ID', {
          month: 'short'
        })} ${weekStart.getFullYear()} - ${weekEnd.getDate().toString().padStart(2, '0')} ${weekEnd.toLocaleDateString('id-ID', {
          month: 'short'
        })} ${weekEnd.getFullYear()}`,
        isCurrentWeek,
        isEditable,
        isFuture
      });

      // Move to next Saturday
      currentSaturday.setDate(currentSaturday.getDate() + 7);
    }
    return periods.reverse(); // Show newest first
  };

  // Get week key for storing data
  const getWeekKey = (weekStart: Date): string => {
    return weekStart.toISOString().split('T')[0];
  };

  // Load existing check-ins
  const loadExistingCheckins = async () => {
    if (!profile?.active_organization_id || !employee?.id) return;
    try {
      // Find key results using the correct hierarchy structure
      let keyResults = null;
      let krError = null;

      // First, determine which type of objective this is by checking which table it exists in
      const {
        data: companyObj
      } = await supabase.from('company_objectives').select('id').eq('id', objectiveId).maybeSingle();
      const {
        data: deptObj
      } = await supabase.from('department_objectives').select('id').eq('id', objectiveId).maybeSingle();
      const {
        data: indivObj
      } = await supabase.from('individual_objectives').select('id').eq('id', objectiveId).maybeSingle();

      // Now search for key results using the appropriate column
      if (companyObj) {
        // For company objectives, use department objectives as key results
        const {
          data: deptObjectives,
          error: deptObjError
        } = await supabase.from('department_objectives').select('id, title, progress_percentage, weight, description').eq('company_objective_id', objectiveId).limit(1);

        // Convert department objectives to key result format
        if (deptObjectives && deptObjectives.length > 0) {
          keyResults = deptObjectives.map(dept => ({
            id: dept.id,
            title: dept.title,
            target_value: 100,
            current_value: dept.progress_percentage || 0,
            unit: '%'
          }));
        }
        krError = deptObjError;
      } else if (deptObj) {
        // For department objectives, use individual objectives as key results
        const {
          data: indivObjectives,
          error: indivObjError
        } = await supabase.from('individual_objectives').select('id, title, progress_percentage, weight, description').eq('department_objective_id', objectiveId).limit(1);

        // Convert individual objectives to key result format
        if (indivObjectives && indivObjectives.length > 0) {
          keyResults = indivObjectives.map(indiv => ({
            id: indiv.id,
            title: indiv.title,
            target_value: 100,
            current_value: indiv.progress_percentage || 0,
            unit: '%'
          }));
        }
        krError = indivObjError;
      } else if (indivObj) {
        const {
          data: indivKRs,
          error: indivKRError
        } = await supabase.from('key_results').select('id, target_value, current_value, unit, title').eq('individual_objective_id', objectiveId).limit(1);
        keyResults = indivKRs;
        krError = indivKRError;
      } else {
        // No objective found in any hierarchy table
        console.log('Objective not found in any hierarchy table:', objectiveId);
        toast({
          title: 'Objective Not Found',
          description: 'This objective could not be found. Please refresh the page and try again.',
          variant: 'destructive'
        });
        setIsOpen(false);
        return;
      }

      // If no key results found for individual objectives, allow direct check-in
      if (krError || !keyResults || keyResults.length === 0) {
        console.log('No key results found for objective:', objectiveId);

        // For individual objectives, allow check-in without key results
        if (indivObj) {
          console.log('Individual objective detected - allowing direct check-in without key results');
          // Set dummy key result data for individual objectives
          setKeyResultData({
            target_value: 100,
            current_value: 0,
            unit: '%',
            id: objectiveId // Use the objective ID directly
          });

          // Load existing check-ins for individual objectives
          const {
            data: existingCheckins,
            error: checkinError
          } = await supabase.from('weekly_checkins').select('*').eq('organization_id', profile.active_organization_id).eq('employee_id', employee.id).eq('individual_objective_id', objectiveId);
          if (!checkinError && existingCheckins) {
            const checkinMap: Record<string, CheckinData> = {};
            existingCheckins.forEach(checkin => {
              const weekKey = checkin.week_start_date;
              checkinMap[weekKey] = {
                id: checkin.id,
                progress_percentage: checkin.current_value || 0,
                status: checkin.status || 'on_track',
                comments: checkin.comments || '',
                blockers: checkin.blockers || '',
                hasChanges: false
              };
            });
            setCheckinData(checkinMap);
          }
          return;
        }
        toast({
          title: 'No Key Results Found',
          description: 'This objective does not have key results to track. Please add key results first.',
          variant: 'destructive'
        });
        setIsOpen(false);
        return;
      }
      const keyResult = keyResults[0];
      const keyResultId = keyResult.id;
      console.log('🎯 Loading check-ins for Key Result:', {
        keyResultId,
        title: keyResult.title,
        objectiveId
      });

      // Set key result data for progress bar
      setKeyResultData({
        target_value: keyResult.target_value || 0,
        current_value: keyResult.current_value || 0,
        unit: keyResult.unit || '',
        id: keyResultId
      });
      const {
        data: existingCheckins,
        error
      } = await supabase.from('weekly_checkins').select('*').eq('organization_id', profile.active_organization_id).eq('employee_id', employee.id).or(`key_result_id.eq.${keyResultId},individual_objective_id.eq.${objectiveId}`);
      if (error) {
        console.error('Error loading existing check-ins:', error);
        return;
      }
      const checkinMap: Record<string, CheckinData> = {};
      existingCheckins?.forEach(checkin => {
        const weekKey = checkin.week_start_date;
        checkinMap[weekKey] = {
          id: checkin.id,
          progress_percentage: checkin.current_value || 0,
          status: checkin.status || 'on_track',
          comments: checkin.comments || '',
          blockers: checkin.blockers || '',
          hasChanges: false
        };
      });
      setCheckinData(checkinMap);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    }
  };

  // Initialize data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadCycleData();
      setHasUnsavedChanges(false);
    }
  }, [isOpen, profile?.active_organization_id, objectiveId]);

  // Generate periods when cycle data is loaded
  useEffect(() => {
    if (cycleData) {
      const periods = generateWeeklyPeriods();
      setWeeklyPeriods(periods);
      loadExistingCheckins();
    }
  }, [cycleData, employee?.id]);

  // Update checkin data for a specific week
  const updateCheckinData = (weekKey: string, field: keyof CheckinData, value: any) => {
    setCheckinData(prev => {
      const current = prev[weekKey] || {
        progress_percentage: 0,
        status: 'on_track' as const,
        comments: '',
        blockers: '',
        hasChanges: false
      };
      const updated = {
        ...current,
        [field]: value,
        hasChanges: true
      };
      setHasUnsavedChanges(true);
      return {
        ...prev,
        [weekKey]: updated
      };
    });
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (!profile?.active_organization_id || !employee?.id || !keyResultData?.id) {
      toast({
        title: 'Error',
        description: 'Unable to find organization, employee, or key result information',
        variant: 'destructive'
      });
      return;
    }
    try {
      // Use the dynamic key result ID from loaded data
      const keyResultId = keyResultData.id;
      console.log('💾 Saving check-ins for Key Result:', keyResultId);
      const changedWeeks = Object.entries(checkinData).filter(([_, data]) => data.hasChanges);
      if (changedWeeks.length === 0) {
        toast({
          title: 'Info',
          description: 'No changes to save'
        });
        return;
      }

      // Check if this is an individual objective (keyResultId === objectiveId)
      const isIndividualObjective = keyResultId === objectiveId;
      for (const [weekKey, data] of changedWeeks) {
        if (isIndividualObjective) {
          // For individual objectives, update the objective's progress directly
          const {
            error: updateObjError
          } = await supabase.from('individual_objectives').update({
            progress_percentage: data.progress_percentage,
            updated_at: new Date().toISOString()
          }).eq('id', objectiveId);
          if (updateObjError) {
            console.error('Error updating individual objective progress:', updateObjError);
            throw updateObjError;
          }

          // Also create weekly check-in records for individual objectives
          if (data.id) {
            // Update existing check-in
            const {
              error
            } = await supabase.from('weekly_checkins').update({
              current_value: data.progress_percentage,
              confidence_level: 8,
              // Default confidence level
              status: data.status,
              comments: data.comments,
              blockers: data.blockers
            }).eq('id', data.id);
            if (error) throw error;
          } else {
            // Create new check-in for individual objective
            const {
              error
            } = await supabase.from('weekly_checkins').insert({
              organization_id: profile.active_organization_id,
              individual_objective_id: objectiveId,
              employee_id: employee.id,
              week_start_date: weekKey,
              current_value: data.progress_percentage,
              confidence_level: 8,
              // Default confidence level
              status: data.status,
              comments: data.comments,
              blockers: data.blockers
            });
            if (error) throw error;
          }
          console.log('✅ Individual objective progress and weekly checkin updated');
        } else {
          // Regular key result flow for company/department objectives
          if (data.id) {
            // Update existing check-in
            const {
              error
            } = await supabase.from('weekly_checkins').update({
              current_value: data.progress_percentage,
              confidence_level: 8,
              // Default confidence level
              status: data.status,
              comments: data.comments,
              blockers: data.blockers
            }).eq('id', data.id);
            if (error) throw error;
          } else {
            // Create new check-in
            const {
              error
            } = await supabase.from('weekly_checkins').insert({
              organization_id: profile.active_organization_id,
              key_result_id: keyResultId,
              employee_id: employee.id,
              week_start_date: weekKey,
              current_value: data.progress_percentage,
              confidence_level: 8,
              // Default confidence level
              status: data.status,
              comments: data.comments,
              blockers: data.blockers
            });
            if (error) throw error;
          }
        }
      }

      // Mark all as saved
      setCheckinData(prev => {
        const updated = {
          ...prev
        };
        Object.keys(updated).forEach(key => {
          updated[key] = {
            ...updated[key],
            hasChanges: false
          };
        });
        return updated;
      });
      setHasUnsavedChanges(false);
      toast({
        title: 'Success',
        description: 'All check-ins saved successfully'
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving check-ins:', error);
      toast({
        title: 'Error',
        description: 'Failed to save check-ins',
        variant: 'destructive'
      });
    }
  };

  // Handle dialog close with unsaved changes
  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      toast({
        title: 'Unsaved Changes',
        description: 'Please save your changes before closing',
        variant: 'destructive'
      });
      return;
    }
    setIsOpen(open);
  };

  // Get progress indicator for a week compared to previous week
  const getProgressIndicator = (weekKey: string, currentProgress: number) => {
    const weekIndex = weeklyPeriods.findIndex(period => getWeekKey(period.weekStart) === weekKey);
    if (weekIndex === -1 || weekIndex === weeklyPeriods.length - 1) return null;
    const previousWeekKey = getWeekKey(weeklyPeriods[weekIndex + 1].weekStart);
    const previousData = checkinData[previousWeekKey];
    if (!previousData || previousData.progress_percentage === 0) return null;
    const diff = currentProgress - previousData.progress_percentage;
    if (diff > 0) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (diff < 0) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    } else {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };
  const defaultTrigger = <Button variant="outline" size="sm">
      <Calendar className="h-4 w-4 mr-2" />
      Check-in
    </Button>;
  return <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-purple-600" />
            Weekly Check-in History
            <span className="text-sm font-normal text-muted-foreground ml-2">
              - {objectiveTitle}
            </span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly periods run from Saturday to Friday. Current and past weeks can be edited.
          </p>
          
          {/* Progress Bar Section */}
          {keyResultData && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">Progress Overview</span>
                <span className="text-sm font-medium text-purple-700 bg-white px-2 py-1 rounded-md">
                  {keyResultData.current_value} / {keyResultData.target_value} {keyResultData.unit}
                </span>
              </div>
              <Progress 
                value={keyResultData.target_value > 0 ? (keyResultData.current_value / keyResultData.target_value) * 100 : 0} 
                className="h-3 bg-white border border-purple-200" 
              />
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>0 {keyResultData.unit}</span>
                <span className="font-medium">{Math.round((keyResultData.current_value / keyResultData.target_value) * 100)}% Complete</span>
                <span>{keyResultData.target_value} {keyResultData.unit}</span>
              </div>
            </div>
          )}
        </DialogHeader>
        
        {/* Tabs Container */}
        <Tabs defaultValue="checkins" className="flex-1 min-h-0 flex flex-col mt-6">
          <TabsList className="grid w-full grid-cols-2 shrink-0 mb-6 bg-gray-100 p-1 rounded-lg h-12">
            <TabsTrigger 
              value="checkins" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700 font-medium transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              Weekly Check-ins
            </TabsTrigger>
            <TabsTrigger 
              value="activities" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700 font-medium transition-all duration-200"
            >
              <Activity className="h-4 w-4" />
              Activities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="checkins" className="flex-1 min-h-0">
            {/* Scrollable Content with Fixed Headers */}
            <div className="flex-1 min-h-0 relative bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Fixed Header Row */}
              <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <div className="flex gap-4 text-sm font-semibold text-gray-700 p-4">
              <div className="w-44 shrink-0">Week Period</div>
              <div className="w-24 shrink-0">Progress</div>
              <div className="w-32 shrink-0">Status</div>
              <div className="flex-1 min-w-52">Comments</div>
              <div className="flex-1 min-w-52">Blockers</div>
            </div>
              </div>
              
              {/* Scrollable Content */}
              <div 
                className="overflow-y-auto overflow-x-hidden"
                style={{ 
                  maxHeight: 'calc(100vh - 520px)',
                  minHeight: '200px'
                }}
              >
                <div className="divide-y divide-gray-100">
              {weeklyPeriods.map(period => {
                  const weekKey = getWeekKey(period.weekStart);
                  const data = checkinData[weekKey] || {
                    progress_percentage: 0,
                    status: 'on_track' as const,
                    comments: '',
                    blockers: '',
                    hasChanges: false
                  };
                  return (
                    <div key={weekKey} className={`flex items-center gap-4 py-3 px-4 transition-colors duration-150 ${
                      period.isCurrentWeek 
                        ? 'bg-purple-50 border-l-4 border-l-purple-500' 
                        : period.isFuture 
                        ? 'bg-gray-50/80' 
                        : 'hover:bg-gray-50/60'
                    } ${!period.isEditable ? 'opacity-60' : ''}`}>
                      
                      {/* Week Period */}
                      <div className="w-44 shrink-0 flex items-center gap-2">
                        <div className="text-sm flex-1">
                          <div className="font-medium text-gray-800 mb-1">{period.displayText}</div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {period.isCurrentWeek && <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-purple-100 text-purple-700">Current</Badge>}
                            {period.isFuture && <Badge variant="outline" className="text-[10px] h-5 px-2 text-blue-600 border-blue-200">Future</Badge>}
                            {!period.isEditable && <Lock className="h-3 w-3 text-gray-400" />}
                            {data.hasChanges && <Badge variant="outline" className="text-[10px] h-5 px-2 text-orange-600 border-orange-200 bg-orange-50">
                                Unsaved
                              </Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="w-24 shrink-0 flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={data.progress_percentage || ''} 
                          onChange={e => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            updateCheckinData(weekKey, 'progress_percentage', value);
                          }} 
                          disabled={!period.isEditable} 
                          className={`h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${!period.isEditable ? 'bg-gray-100' : 'bg-white'}`} 
                          placeholder="0" 
                        />
                        {getProgressIndicator(weekKey, data.progress_percentage)}
                      </div>

                      {/* Status */}
                      <div className="w-32 shrink-0">
                        <Select value={data.status} onValueChange={(value: 'on_track' | 'at_risk' | 'off_track') => updateCheckinData(weekKey, 'status', value)} disabled={!period.isEditable}>
                          <SelectTrigger className={`h-9 text-sm border-gray-300 focus:border-purple-500 ${!period.isEditable ? 'bg-gray-100' : 'bg-white'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            <SelectItem value="on_track">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm">On Track</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="at_risk">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm">At Risk</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="off_track">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-sm">Off Track</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Comments */}
                      <div className="flex-1 min-w-52">
                        <Textarea 
                          placeholder="Comments..." 
                          value={data.comments} 
                          onChange={e => updateCheckinData(weekKey, 'comments', e.target.value)} 
                          disabled={!period.isEditable} 
                          className={`min-h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none ${!period.isEditable ? 'bg-gray-100' : 'bg-white'}`} 
                          rows={1} 
                        />
                      </div>

                      {/* Blockers */}
                      <div className="flex-1 min-w-52">
                        <Textarea 
                          placeholder="Blockers..." 
                          value={data.blockers} 
                          onChange={e => updateCheckinData(weekKey, 'blockers', e.target.value)} 
                          disabled={!period.isEditable} 
                          className={`min-h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none ${!period.isEditable ? 'bg-gray-100' : 'bg-white'}`} 
                          rows={1} 
                        />
                      </div>

                      {/* Actions - Hidden since we removed it from header but keep structure */}
                      <div className="w-4 shrink-0 flex justify-center">
                        {data.hasChanges && (
                          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-sm"></div>
                        )}
                      </div>
                    </div>
                  );
                 })}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="activities" className="flex-1 min-h-0">
            <ActivitiesTab 
              objectiveId={objectiveId}
              objectiveTitle={objectiveTitle}
            />
          </TabsContent>
        </Tabs>

        {/* Fixed Footer */}
        <div className="shrink-0 flex justify-between items-center pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {hasUnsavedChanges && <span className="text-orange-600">You have unsaved changes</span>}
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={hasUnsavedChanges}>
              {hasUnsavedChanges ? 'Save First' : 'Close'}
            </Button>
            <Button onClick={handleSaveAll} disabled={!hasUnsavedChanges} className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
