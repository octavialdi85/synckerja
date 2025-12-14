
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Button } from '@/features/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, Target } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
// import "@/styles/datepicker.css"; // File tidak ada
import { format } from 'date-fns';
import { ContentManager } from '../../types/social-media';
import { useDigitalMarketingEmployees } from '../../hook/useDigitalMarketingEmployees';
import { useOptimizedSocialMedia } from '../../hook/useOptimizedSocialMediaState';
import { useEmployeeTargets } from '../../hook/useEmployeeTargets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProgressBar } from '@/features/share/ProgressBar';
import EditTargetDialog from '../../modal/EditTargetDialog';

interface ContentPostTabProps {
  contentManagers: ContentManager[];
  handleEditTarget: (manager: ContentManager) => void;
}

const ContentPostTab: React.FC<ContentPostTabProps> = ({
  contentManagers,
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

  const { data: digitalEmployees = [] } = useDigitalMarketingEmployees();
  const { contentPlans } = useOptimizedSocialMedia();
  const { targets } = useEmployeeTargets();

  // Fetch all social media links to ensure we have the latest data
  // Disabled polling - rely on realtime updates instead of refetchInterval
  const { data: allSocialMediaLinks = [] } = useQuery({
    queryKey: ['all-social-media-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_links')
        .select('*');
      
      if (error) {
        console.error('Error fetching social media links:', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cached data
    refetchInterval: false, // Disabled - realtime updates handle changes, no need for polling
    refetchOnWindowFocus: false, // Disabled to prevent reload when switching windows (realtime handles updates)
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });

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

  // Helper function to extract date string from date value (same as ProductionTab and ContentPlannerTab)
  // Enhanced to handle DD/MM/YYYY format
  const getDateString = (dateValue: string | Date | null | undefined): string | null => {
    if (!dateValue) return null;
    
    try {
      if (typeof dateValue === 'string') {
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        // Handle DD/MM/YYYY format (e.g., "04/11/2025")
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
          const [day, month, year] = dateValue.split('/');
          return `${year}-${month}-${day}`;
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

  // Calculate daily posted content count for specific PIC and exact date
  // Logic: count when done=true (toggle Done = On) OR has social media links
  // Priority: actual_post_date > post_date for date matching
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateDailyPosted = useCallback((picId: string, targetDate: Date) => {
    // Use local date to avoid timezone issues (same as ProductionTab and ContentPlannerTab)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const targetDateString = `${year}-${month}-${day}`;
    
    return contentPlans.filter(plan => {
      // Must have pic_id
      if (!plan.pic_id || plan.pic_id !== picId) {
        return false;
      }

      // Check if content is posted: done=true (toggle Done = On) OR has social media links
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      const isPosted = plan.done === true || hasLinks;
      
      if (!isPosted) {
        return false;
      }

      // Priority: actual_post_date > post_date for date matching
      // Check actual_post_date first (most reliable - when content was actually posted)
      if (plan.actual_post_date) {
        const actualPostDateStr = getDateString(plan.actual_post_date);
        if (actualPostDateStr && actualPostDateStr === targetDateString) {
          return true;
        }
      }

      // Fallback: check post_date if actual_post_date doesn't match or doesn't exist
      // Also check post_date if actual_post_date is null/undefined but content is posted
      if (plan.post_date) {
        const postDateStr = getDateString(plan.post_date);
        if (postDateStr && postDateStr === targetDateString) {
          return true;
        }
      }

      // If no actual_post_date and post_date doesn't match, but content is posted (done=true or has links)
      // and we're looking at today's date, we might want to count it
      // But for now, we require date match - so return false
      return false;
    }).length;
  }, [contentPlans, allSocialMediaLinks]);

  // Calculate monthly posted content count for specific PIC and month/year
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculateMonthlyPosted = useCallback((picId: string, targetDate: Date) => {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    return contentPlans.filter(plan => {
      // Must have pic_id
      if (!plan.pic_id || plan.pic_id !== picId) {
        return false;
      }

      // Must have post_date
      if (!plan.post_date) {
        return false;
      }
      
      // Parse post_date and check if it matches target month/year
      const postDateStr = getDateString(plan.post_date);
      if (!postDateStr) {
        return false;
      }
      
      const planDate = new Date(postDateStr + 'T00:00:00');
      if (planDate.getFullYear() !== targetYear || planDate.getMonth() !== targetMonth) {
        return false;
      }
      
      // Check if content is posted: done=true (toggle Done = On) OR has social media links
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      return plan.done === true || hasLinks;
    }).length;
  }, [contentPlans, allSocialMediaLinks]);

  // Calculate on time rate for content posting
  // Use useCallback to memoize function and ensure it updates when dependencies change
  const calculatePostingOnTimeRate = useCallback((picId: string, targetDate: Date) => {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    const monthlyPlans = contentPlans.filter(plan => {
      if (!plan.pic_id || plan.pic_id !== picId || !plan.post_date) {
        return false;
      }
      
      const planDate = new Date(plan.post_date);
      if (planDate.getFullYear() !== targetYear || planDate.getMonth() !== targetMonth) {
        return false;
      }
      
      // Check if content is posted (either done=true OR has social media links)
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      return plan.done === true || hasLinks;
    });

    if (monthlyPlans.length === 0) return 100;

    const onTimePlans = monthlyPlans.filter(plan => {
      if (plan.actual_post_date && plan.post_date) {
        const actualPostDate = new Date(plan.actual_post_date);
        const scheduledPostDate = new Date(plan.post_date);
        return actualPostDate <= scheduledPostDate;
      }
      return true;
    });

    return Math.round((onTimePlans.length / monthlyPlans.length) * 100);
  }, [contentPlans, allSocialMediaLinks]);

  // Get target for specific employee
  const getEmployeeTarget = (employeeId: string) => {
    return targets.find(target => 
      target.employee_id === employeeId && 
      target.target_type === 'content_posting' &&
      target.status === 'active'
    );
  };

  // Get actual PIC names from content plans with calculated metrics
  // Use useMemo to recalculate when contentPlans, allSocialMediaLinks, or dates change
  const actualPostingPICData = useMemo(() => {
    const picData = [];
    
    // Get unique PICs from content plans
    const uniquePICs = new Set();
    contentPlans.forEach(plan => {
      if (plan.pic_id && !uniquePICs.has(plan.pic_id)) {
        uniquePICs.add(plan.pic_id);
        
        const employee = digitalEmployees.find(emp => emp.id === plan.pic_id);
        if (employee) {
          const dailyPostedCount = calculateDailyPosted(plan.pic_id, dailyTargetDate);
          const monthlyPostedCount = calculateMonthlyPosted(plan.pic_id, monthlyTargetDate);
          const onTimeRate = calculatePostingOnTimeRate(plan.pic_id, monthlyTargetDate);
          const employeeTarget = getEmployeeTarget(employee.id);
          
          const currentValue = monthlyPostedCount; // Use monthly posted count as current value
          const targetValue = employeeTarget?.target_value || 0;
          
          // Calculate progress percentage
          const progress = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
          
          // Calculate score as average of Progress and On Time Rate only (no Effective Rate)
          const score = Math.round((progress + onTimeRate) / 2);
          
          picData.push({
            id: employee.id,
            name: employee.full_name,
            pic: employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
            dailyTarget: dailyPostedCount,
            monthlyTarget: monthlyPostedCount,
            targetAdjusted: targetValue,
            currentValue: currentValue,
            progress: progress,
            onTimeRate: onTimeRate,
            score: score,
            hasTarget: !!employeeTarget,
            targetStatus: employeeTarget?.status || 'none'
          });
        }
      }
    });
    
    return picData;
  }, [contentPlans, allSocialMediaLinks, dailyTargetDate, monthlyTargetDate, digitalEmployees, targets, calculateDailyPosted, calculateMonthlyPosted, calculatePostingOnTimeRate]);

  const displayData = actualPostingPICData.slice(currentPICPage * 2, (currentPICPage + 1) * 2);
  
  // Ensure exactly 2 rows
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
    const actualPICCount = actualPostingPICData.length;
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
                    <span className="text-xs">PIC Content Post</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextPIC}
                      className="h-5 w-5 p-0"
                      disabled={currentPICPage >= Math.ceil(actualPostingPICData.length / 2) - 1}
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
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium relative">
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
                    <span className="text-xs font-semibold text-purple-600">{manager.dailyTarget || 0}</span>
                  </TableCell>
                  
                  <TableCell className="w-[90px] px-2 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs font-semibold text-indigo-600">{manager.monthlyTarget || 0}</span>
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
                      color="purple"
                    />
                  </TableCell>
                  
                  <TableCell className="w-[110px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs">{manager.name ? `${manager.onTimeRate}%` : '-'}</span>
                  </TableCell>
                  
                  <TableCell className="w-[80px] px-3 py-2 text-center border-r border-gray-100 h-10">
                    <span className="text-xs font-bold text-purple-600">{manager.name ? manager.score : '-'}</span>
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
        targetType="content_posting"
        existingTarget={selectedEmployee ? getEmployeeTarget(selectedEmployee.id) : undefined}
      />
    </>
  );
};

export default ContentPostTab;
