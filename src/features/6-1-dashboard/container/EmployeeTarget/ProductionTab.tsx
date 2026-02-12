import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Button } from '@/features/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, Target } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { ContentManager } from '../../types/social-media';
import type { DigitalMarketingEmployee } from '../../hook/useDigitalMarketingEmployees';
import { useDigitalMarketingEmployees } from '../../hook/useDigitalMarketingEmployees';
import { useOptimizedSocialMedia } from '../../hook/useOptimizedSocialMediaState';
import { useEmployeeTargets } from '../../hook/useEmployeeTargets';
import { ProgressBar } from '@/features/share/ProgressBar';
import EditTargetDialog from '../../modal/EditTargetDialog';
import { devLog } from '@/config/logger';

interface ProductionTabProps {
  contentManagers: ContentManager[];
  digitalEmployees?: DigitalMarketingEmployee[];
  handleEditTarget: (manager: ContentManager) => void;
}

const ProductionTab: React.FC<ProductionTabProps> = ({
  contentManagers,
  digitalEmployees: digitalEmployeesProp,
  handleEditTarget
}) => {
  const [dailyTargetDate, setDailyTargetDate] = useState<Date>(new Date());
  const [monthlyTargetDate, setMonthlyTargetDate] = useState<Date>(new Date());
  const [currentPICPage, setCurrentPICPage] = useState(0);
  const [isDailyDateEditing, setIsDailyDateEditing] = useState(false);
  const [isMonthlyDateEditing, setIsMonthlyDateEditing] = useState(false);
  const [isEditTargetDialogOpen, setIsEditTargetDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  
  const dailyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const monthlyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: digitalEmployeesFromHook = [] } = useDigitalMarketingEmployees();
  const digitalEmployees = digitalEmployeesProp?.length ? digitalEmployeesProp : digitalEmployeesFromHook;
  const { contentPlans } = useOptimizedSocialMedia();
  const { targets } = useEmployeeTargets();

  // Auto-revert functionality for daily date
  useEffect(() => {
    const today = new Date();
    const isDifferentDay = dailyTargetDate.getDate() !== today.getDate() || 
                          dailyTargetDate.getMonth() !== today.getMonth() ||
                          dailyTargetDate.getFullYear() !== today.getFullYear();
    
    if (isDifferentDay && dailyTimeoutRef.current) {
      clearTimeout(dailyTimeoutRef.current);
    }
    
    if (isDifferentDay) {
      dailyTimeoutRef.current = setTimeout(() => {
        setDailyTargetDate(new Date());
      }, 5000);
    }
    
    return () => {
      if (dailyTimeoutRef.current) {
        clearTimeout(dailyTimeoutRef.current);
      }
    };
  }, [dailyTargetDate]);

  // Auto-revert functionality for monthly date
  useEffect(() => {
    const today = new Date();
    const isDifferentMonth = monthlyTargetDate.getMonth() !== today.getMonth() ||
                            monthlyTargetDate.getFullYear() !== today.getFullYear();
    
    if (isDifferentMonth && monthlyTimeoutRef.current) {
      clearTimeout(monthlyTimeoutRef.current);
    }
    
    if (isDifferentMonth) {
      monthlyTimeoutRef.current = setTimeout(() => {
        setMonthlyTargetDate(new Date());
      }, 5000);
    }
    
    return () => {
      if (monthlyTimeoutRef.current) {
        clearTimeout(monthlyTimeoutRef.current);
      }
    };
  }, [monthlyTargetDate]);

  // Helper function to extract date string from date value (same as SocialMediaDashboardPage)
  const getDateString = (dateValue: string | Date | null | undefined): string | null => {
    if (!dateValue) return null;
    
    try {
      if (typeof dateValue === 'string') {
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        // If contains 'T', split and take date part
        if (dateValue.includes('T')) {
          return dateValue.split('T')[0];
        }
        // If contains space, split and take date part (format: "YYYY-MM-DD HH:mm:ss")
        if (dateValue.includes(' ')) {
          return dateValue.split(' ')[0];
        }
        // Otherwise, try to parse it
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          // Use local date to avoid timezone issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      
      if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) {
          // Use local date to avoid timezone issues
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    } catch (e) {
      // Silently fail and return null
    }
    
    return null;
  };

  // Calculate daily production count for specific PIC and exact date
  // Logic matches SocialMediaDashboardPage metrics: filter by production_approved_date or production_completion_date
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateDailyProduction = useCallback((picId: string, targetDate: Date) => {
    // Use local date to avoid timezone issues (same as metrics)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const targetDateString = `${year}-${month}-${day}`;
    
    return contentPlans.filter(plan => {
      // Must have pic_production_id
      if (!plan.pic_production_id || plan.pic_production_id !== picId) {
        return false;
      }

      // Must be approved
      if (plan.production_approved !== true) {
        return false;
      }

      // Priority: production_approved_date > production_completion_date > post_date (if approved)
      // Check production_approved_date first (most reliable)
      const approvedDateStr = getDateString(plan.production_approved_date);
      if (approvedDateStr && approvedDateStr === targetDateString) {
        return true;
      }

      // Check production_completion_date second
      const completionDateStr = getDateString(plan.production_completion_date);
      if (completionDateStr && completionDateStr === targetDateString) {
        return true;
      }

      // Fallback: if production_approved is true and post_date is today
      if (plan.post_date) {
        const postDateStr = getDateString(plan.post_date);
        if (postDateStr && postDateStr === targetDateString) {
          return true;
        }
      }

      return false;
    }).length;
  }, [contentPlans]);

  // Calculate monthly production count for specific PIC and month/year - FIXED: Only count if production_approved is true
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateMonthlyProduction = useCallback((picId: string, targetDate: Date) => {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    return contentPlans.filter(plan => {
      if (!plan.pic_production_id || plan.pic_production_id !== picId || !plan.post_date) {
        return false;
      }
      
      const planDate = new Date(plan.post_date);
      if (planDate.getFullYear() !== targetYear || planDate.getMonth() !== targetMonth) {
        return false;
      }
      
      // FIXED: Only count when production_approved is true
      return plan.production_approved === true;
    }).length;
  }, [contentPlans]);

  // Calculate on time rate for production - FIXED: Use production_approved_date instead of production_completion_date
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateProductionOnTimeRate = useCallback((picId: string, targetDate: Date) => {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    const monthlyPlans = contentPlans.filter(plan => {
      if (!plan.pic_production_id || plan.pic_production_id !== picId || !plan.post_date) {
        return false;
      }
      
      const planDate = new Date(plan.post_date);
      if (planDate.getFullYear() !== targetYear || planDate.getMonth() !== targetMonth) {
        return false;
      }
      
      // FIXED: Only count when production_approved is true
      return plan.production_approved === true;
    });

    if (monthlyPlans.length === 0) return 100;

    const onTimePlans = monthlyPlans.filter(plan => {
      // FIXED: Use production_approved_date instead of production_completion_date
      if (plan.production_approved_date && plan.post_date) {
        const approvedDate = new Date(plan.production_approved_date);
        const scheduledPostDate = new Date(plan.post_date);
        return approvedDate <= scheduledPostDate;
      }
      return true;
    });

    return Math.round((onTimePlans.length / monthlyPlans.length) * 100);
  }, [contentPlans]);

  // Track logged calculations to avoid duplicate logs
  const loggedCalculationsRef = useRef<Set<string>>(new Set());

  // Calculate effective rate based on production revision counts - FIXED: Only count approved production
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateProductionEffectiveRate = useCallback((picId: string, targetDate: Date) => {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    // Get all approved production plans for this PIC in the target month
    const monthlyPlans = contentPlans.filter(plan => {
      if (!plan.pic_production_id || plan.pic_production_id !== picId || !plan.post_date) {
        return false;
      }
      
      const planDate = new Date(plan.post_date);
      if (planDate.getFullYear() !== targetYear || planDate.getMonth() !== targetMonth) {
        return false;
      }
      
      // FIXED: Only count when production_approved is true
      return plan.production_approved === true;
    });

    if (monthlyPlans.length === 0) return 100;

    // Calculate total production revisions for the month
    const totalRevisions = monthlyPlans.reduce((sum, plan) => {
      return sum + (plan.production_revision_count || 0);
    }, 0);

    // Calculate effective rate: higher revision count = lower effective rate
    // Formula: 100 - (average revisions per content * 10)
    const averageRevisionsPerContent = totalRevisions / monthlyPlans.length;
    const effectiveRate = Math.max(0, Math.round(100 - (averageRevisionsPerContent * 10)));
    
    // Only log once per unique calculation (picId + month combination)
    const logKey = `${picId}-${targetYear}-${targetMonth}-${effectiveRate}`;
    if (!loggedCalculationsRef.current.has(logKey)) {
      loggedCalculationsRef.current.add(logKey);
      // Clear old entries periodically to prevent memory leak
      if (loggedCalculationsRef.current.size > 100) {
        loggedCalculationsRef.current.clear();
      }
      devLog.debug('📊 Effective Rate Calculation (Production):', {
        picId,
        totalContent: monthlyPlans.length,
        totalRevisions,
        averageRevisionsPerContent,
        effectiveRate
      });
    }

    return effectiveRate;
  }, [contentPlans]);

  // Get target for specific employee
  const getEmployeeTarget = (employeeId: string) => {
    return targets.find(target => 
      target.employee_id === employeeId && 
      target.target_type === 'content_production' &&
      target.status === 'active'
    );
  };

  // Enhanced progress calculation
  const calculateProgress = (currentValue: number, targetValue: number) => {
    if (targetValue === 0) return 0;
    const percentage = Math.round((currentValue / targetValue) * 100);
    return Math.min(percentage, 100);
  };

  // Get actual Production PIC names from content plans with calculated metrics
  // Use useMemo to ensure recalculation when contentPlans or dates change (same structure as ContentPostTab)
  const actualProductionPICData = useMemo(() => {
    const picData = [];
    
    const uniquePICs = new Set();
    contentPlans.forEach(plan => {
      if (plan.pic_production_id && !uniquePICs.has(plan.pic_production_id)) {
        uniquePICs.add(plan.pic_production_id);
        
        const employee = digitalEmployees.find(emp => emp.id === plan.pic_production_id);
        if (employee) {
          const dailyProductionCount = calculateDailyProduction(plan.pic_production_id, dailyTargetDate);
          const monthlyProductionCount = calculateMonthlyProduction(plan.pic_production_id, monthlyTargetDate);
          const onTimeRate = calculateProductionOnTimeRate(plan.pic_production_id, monthlyTargetDate);
          const effectiveRate = calculateProductionEffectiveRate(plan.pic_production_id, monthlyTargetDate);
          const employeeTarget = getEmployeeTarget(employee.id);
          
          const currentValue = monthlyProductionCount; // Use monthly production count as current value
          const targetValue = employeeTarget?.target_value || 0;
          const progress = calculateProgress(currentValue, targetValue);
          
          // Calculate score as average of Progress, On Time Rate, and Effective Rate
          const score = Math.round((progress + onTimeRate + effectiveRate) / 3);
          
          picData.push({
            id: employee.id,
            name: employee.full_name,
            pic: employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
            dailyTarget: dailyProductionCount,
            monthlyTarget: monthlyProductionCount,
            targetAdjusted: targetValue,
            currentValue: currentValue,
            progress: progress,
            onTimeRate: onTimeRate,
            effectiveRate: effectiveRate,
            score: score,
            hasTarget: !!employeeTarget,
            targetStatus: employeeTarget?.status || 'none'
          });
        }
      }
    });
    
    return picData;
  }, [contentPlans, dailyTargetDate, monthlyTargetDate, digitalEmployees, targets, calculateDailyProduction, calculateMonthlyProduction, calculateProductionOnTimeRate, calculateProductionEffectiveRate]);

  const displayData = actualProductionPICData.slice(currentPICPage * 2, (currentPICPage + 1) * 2);
  
  while (displayData.length < 2) {
    displayData.push({
      id: '',
      name: '',
      pic: '',
      dailyTarget: 0,
      monthlyTarget: 0,
      targetAdjusted: 0,
      currentValue: 0,
      progress: 0,
      onTimeRate: 0,
      effectiveRate: 0,
      score: 0,
      hasTarget: false,
      targetStatus: 'none'
    });
  }

  const handleDailyDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setDailyTargetDate(new Date(newDate));
    }
    setIsDailyDateEditing(false);
  };

  const handleMonthlyDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setMonthlyTargetDate(new Date(newDate + '-01'));
    }
    setIsMonthlyDateEditing(false);
  };

  const handlePreviousPIC = () => {
    setCurrentPICPage(Math.max(0, currentPICPage - 1));
  };

  const handleNextPIC = () => {
    const actualPICCount = actualProductionPICData.length;
    const maxPage = Math.ceil(actualPICCount / 2) - 1;
    setCurrentPICPage(Math.min(maxPage, currentPICPage + 1));
  };

  const handleEditTargetClick = (employee: any) => {
    if (employee.id) {
      setSelectedEmployee({ id: employee.id, name: employee.name });
      setIsEditTargetDialogOpen(true);
    }
  };

  return (
    <>
      <div className="w-full border border-gray-200 rounded-lg overflow-visible bg-white" style={{ height: '130px' }}>
        <div className="relative h-full">
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-white z-20">
              <TableRow className="border-b border-gray-200 hover:bg-transparent h-10">
                <TableHead className="w-[200px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousPIC}
                      className="h-5 w-5 p-0"
                      disabled={currentPICPage === 0}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs">PIC Production</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextPIC}
                      className="h-5 w-5 p-0"
                      disabled={currentPICPage >= Math.ceil(actualProductionPICData.length / 2) - 1}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
                
                <TableHead className="w-[90px] px-2 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  {isDailyDateEditing ? (
                    <input
                      type="date"
                      value={format(dailyTargetDate, 'yyyy-MM-dd')}
                      onChange={handleDailyDateChange}
                      onBlur={() => setIsDailyDateEditing(false)}
                      autoFocus
                      className="h-8 px-3 text-xs w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                    />
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsDailyDateEditing(true)}
                      className="h-8 px-3 text-xs w-full justify-center rounded-sm"
                    >
                      <CalendarIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate font-medium">
                        {format(dailyTargetDate, "dd MMM yyyy")}
                      </span>
                    </Button>
                  )}
                </TableHead>
                
                <TableHead className="w-[90px] px-2 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  {isMonthlyDateEditing ? (
                    <input
                      type="month"
                      value={format(monthlyTargetDate, 'yyyy-MM')}
                      onChange={handleMonthlyDateChange}
                      onBlur={() => setIsMonthlyDateEditing(false)}
                      autoFocus
                      className="h-8 px-3 text-xs w-full border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                    />
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsMonthlyDateEditing(true)}
                      className="h-8 px-3 text-xs w-full justify-center rounded-sm"
                    >
                      <CalendarIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate font-medium">
                        {format(monthlyTargetDate, "MMM yyyy")}
                      </span>
                    </Button>
                  )}
                </TableHead>
                
                <TableHead className="w-[120px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  Target Adjusted
                </TableHead>
                
                <TableHead className="w-[140px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  Progress
                </TableHead>
                
                <TableHead className="w-[110px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  On Time Rate
                </TableHead>
                
                <TableHead className="w-[110px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  Effective Rate
                </TableHead>
                
                <TableHead className="w-[80px] px-3 py-2 text-center font-medium text-xs border-r border-gray-200 bg-white h-10">
                  Score
                </TableHead>
                
                <TableHead className="w-[80px] px-3 py-2 text-center font-medium text-xs bg-white h-10">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {displayData.map((manager, index) => (
                <TableRow key={index} className="hover:bg-gray-50 border-b border-gray-100 h-10">
                  <TableCell className="w-[200px] px-3 py-2 border-r border-gray-100 h-10">
                    {manager.name ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium relative">
                          {manager.pic}
                          {manager.hasTarget && (
                            <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                              manager.targetStatus === 'completed' ? 'bg-green-500' :
                              manager.targetStatus === 'overdue' ? 'bg-red-500' :
                              manager.targetStatus === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                          )}
                        </div>
                        <span className="text-xs font-medium truncate">{manager.name}</span>
                      </div>
                    ) : (
                      <div className="h-6 flex items-center justify-center">
                        <span className="text-xs text-gray-400">-</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="w-[90px] px-2 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs font-semibold text-green-600">{manager.dailyTarget || 0}</span>
                  </TableCell>
                  
                  <TableCell className="w-[90px] px-2 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs font-semibold text-emerald-600">{manager.monthlyTarget || 0}</span>
                  </TableCell>
                  
                  <TableCell className="w-[120px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs">
                      {manager.name && manager.targetAdjusted ? `${manager.currentValue}/${manager.targetAdjusted}` : '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell className="w-[140px] px-3 py-2 border-r border-gray-100 h-10">
                    <ProgressBar 
                      current={manager.currentValue || 0} 
                      target={manager.targetAdjusted || 0}
                      color="green"
                    />
                  </TableCell>
                  
                  <TableCell className="w-[110px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs">{manager.name ? `${manager.onTimeRate}%` : '-'}</span>
                  </TableCell>
                  
                  <TableCell className="w-[110px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs">{manager.name ? `${manager.effectiveRate}%` : '-'}</span>
                  </TableCell>
                  
                  <TableCell className="w-[80px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs font-bold text-green-600">{manager.name ? manager.score : '-'}</span>
                  </TableCell>
                  
                  <TableCell className="w-[80px] px-3 py-2 text-center h-10">
                    {manager.name ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTargetClick(manager)}
                        className="h-6 px-2 text-xs"
                        title={manager.hasTarget ? 'Edit target' : 'Create target'}
                      >
                        {manager.hasTarget ? <Edit className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                      </Button>
                    ) : (
                      <div className="h-6"></div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditTargetDialog
        isOpen={isEditTargetDialogOpen}
        onClose={() => {
          setIsEditTargetDialogOpen(false);
          setSelectedEmployee(null);
        }}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
        targetType="content_production"
        existingTarget={selectedEmployee ? getEmployeeTarget(selectedEmployee.id) : undefined}
      />
    </>
  );
};

export default ProductionTab;
