import React, { useMemo } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { useBatchSocialMediaLinks } from '../hooks/useBatchSocialMediaLinks';

const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface CalendarGridProps {
  calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>;
  getDayInfo: (date: Date) => any;
  onDayClick: (date: Date, dayInfo: any) => void;
  onPlanClick?: (date: Date, plan: any) => void; // Optional: handler for clicking individual plan card
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarDays,
  getDayInfo,
  onDayClick,
  onPlanClick
}) => {
  // Extract plan IDs for green cards (done = true) to fetch links
  // Extract directly from calendarDays to avoid dependency on getDayInfo function
  const planIdsForLinks = useMemo(() => {
    const ids: string[] = [];
    calendarDays.forEach(({ date }) => {
      const dayInfo = getDayInfo(date);
      dayInfo.plans?.forEach((plan: any) => {
        // Only green cards (done = true) need social_media_links
        if (plan?.approved && plan?.production_approved && plan?.done && plan?.id) {
          ids.push(plan.id);
        }
      });
    });
    return [...new Set(ids)]; // Remove duplicates
  }, [calendarDays, getDayInfo]);

  // Batch fetch links for green cards
  const { data: linksByPlanId = {} } = useBatchSocialMediaLinks(planIdsForLinks);

  // Helper function to validate URL
  const isValidUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="relative">
      {/* Days of week header - Fixed positioning */}
      <div className="grid grid-cols-7 mb-2 sticky -top-4 z-20 bg-white py-2 -mt-4" style={{gap: '4px'}}>
        {indonesianDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md" style={{border: 'none', outline: 'none', boxShadow: 'none'}}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days with padding top to account for sticky header */}
      <div className="grid grid-cols-7 gap-1 pt-2">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dayInfo = getDayInfo(date);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div
              key={index}
              onClick={() => onDayClick(date, dayInfo)}
              className={`
                aspect-square p-2 border border-slate-200 dark:border-slate-700 flex flex-col text-xs relative cursor-pointer transition-colors overflow-hidden
                ${!isCurrentMonth ? 'text-slate-400 bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800'}
                ${isToday ? 'ring-2 ring-primary' : ''}
                hover:shadow-md hover:scale-105 transition-all duration-200
              `}
            >
              <div className="font-medium text-sm mb-1">
                {date.getDate()}
              </div>
              
              {dayInfo.count > 0 ? (
                <div className="flex-1 space-y-1 overflow-y-auto seamless-scroll">
                  {dayInfo.plans.map((plan: any, planIndex: number) => {
                    // Determine individual plan color based on status
                    const approved = plan?.approved === true;
                    const productionApproved = plan?.production_approved === true;
                    const done = plan?.done === true;
                    const onTimeStatus = plan?.on_time_status;
                    
                    // Check if on_time_status is not "Ontime" and not NULL/Empty
                    const hasLateStatus = onTimeStatus && 
                                         typeof onTimeStatus === 'string' &&
                                         onTimeStatus.trim() !== '' && 
                                         onTimeStatus !== 'Ontime' &&
                                         onTimeStatus.toLowerCase().includes('late');
                    
                    let planStatus = 'blue';
                    if (!approved && !productionApproved && !done) {
                      planStatus = 'red';
                    } else if (approved && !productionApproved && !done) {
                      planStatus = 'orange';
                    } else if (approved && productionApproved && !done) {
                      planStatus = 'yellow';
                    } else if (approved && productionApproved && done) {
                      planStatus = 'green';
                    }
                    
                    // Get links for green cards (with null safety)
                    const planLinks = (plan?.id && linksByPlanId[plan.id]) || [];
                    
                    // Check yellow card for google_drive_link (with validation)
                    const hasGoogleDriveLink = planStatus === 'yellow' && 
                                             productionApproved && 
                                             plan?.google_drive_link &&
                                             isValidUrl(plan.google_drive_link);
                    
                    return (
                      <div 
                        key={planIndex} 
                        onClick={(e) => {
                          // Stop propagation to prevent day click handler
                          e.stopPropagation();
                          // If onPlanClick is provided, call it to open only this specific plan
                          if (onPlanClick) {
                            onPlanClick(date, plan);
                          }
                        }}
                        className={`text-xs space-y-0.5 p-1.5 rounded shadow-sm cursor-pointer hover:opacity-90 hover:shadow-md transition-all ${
                          planStatus === 'green' ? 'bg-green-500 text-white shadow-lg shadow-green-300/50 ring-1 ring-green-300/20' :
                          planStatus === 'yellow' ? 'bg-amber-400 text-gray-900' :
                          planStatus === 'orange' ? 'bg-orange-500 text-white' :
                          planStatus === 'red' ? 'bg-red-500 text-white shadow-lg shadow-red-300/50 ring-1 ring-red-300/20' :
                          'bg-blue-50 border border-blue-200 text-blue-900'
                        }`}
                      >
                        {/* Late Status Text - Show if plan is green with late status */}
                        {planStatus === 'green' && hasLateStatus && onTimeStatus && (
                          <div className="text-[10px] font-bold text-white mb-0.5 bg-red-500 px-1 py-0.5 rounded shadow-sm">
                            {onTimeStatus}
                          </div>
                        )}
                        
                        {/* Service - Sub Service - Pillar */}
                        <div className={`truncate text-[10px] ${
                          planStatus === 'green' ? 'text-emerald-50' :
                          planStatus === 'yellow' ? 'text-gray-800' :
                          planStatus === 'orange' ? 'text-orange-50' :
                          planStatus === 'red' ? 'text-red-50' :
                          'text-blue-700'
                        }`}>
                          {[
                            plan?.service?.name,
                            plan?.sub_service?.name,
                            plan?.content_pillar?.name
                          ].filter(Boolean).join(' - ') || 'No Service'}
                        </div>
                        
                        {/* Title */}
                        <div className={`font-semibold truncate ${
                          planStatus === 'green' ? 'text-white' :
                          planStatus === 'yellow' ? 'text-gray-900' :
                          planStatus === 'orange' ? 'text-white' :
                          planStatus === 'red' ? 'text-white' :
                          'text-blue-900'
                        }`}>
                          {plan?.title || 'Untitled'}
                        </div>
                        
                        {/* PIC */}
                        <div className={`truncate text-[10px] ${
                          planStatus === 'green' ? 'text-emerald-100' :
                          planStatus === 'yellow' ? 'text-gray-700' :
                          planStatus === 'orange' ? 'text-orange-100' :
                          planStatus === 'red' ? 'text-red-100' :
                          'text-blue-600'
                        }`}>
                          PIC: {plan?.pic?.full_name || 'Unassigned'}
                        </div>
                        
                        {/* NEW: Green cards - Display all social media links */}
                        {planStatus === 'green' && planLinks.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/20">
                            <div className="text-[9px] font-semibold text-emerald-50 mb-0.5">
                              Links:
                            </div>
                            <div className="space-y-0.5 max-h-16 overflow-y-auto">
                              {planLinks
                                .filter(link => link?.url && isValidUrl(link.url)) // Filter invalid URLs
                                .slice(0, 3) // Limit to 3 links to prevent overflow
                                .map((link) => (
                                <a
                                  key={link.id}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Only stop on link click, not card click
                                  }}
                                  className="flex items-center gap-1 text-[9px] text-emerald-100 hover:text-white hover:underline truncate"
                                  title={`${link.platform || 'Link'}: ${link.url}`}
                                >
                                  <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {link.platform || 'Link'}: {link.url.length > 25 ? link.url.substring(0, 25) + '...' : link.url}
                                  </span>
                                </a>
                              ))}
                              {planLinks.filter(link => link?.url && isValidUrl(link.url)).length > 3 && (
                                <div className="text-[8px] text-emerald-200">
                                  +{planLinks.filter(link => link?.url && isValidUrl(link.url)).length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* NEW: Yellow cards - Display google_drive_link */}
                        {hasGoogleDriveLink && (
                          <div className="mt-1.5 pt-1.5 border-t border-amber-300/20">
                            <div className="text-[9px] font-semibold text-gray-800 mb-0.5">
                              Preview:
                            </div>
                            <a
                              href={plan.google_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation(); // Only stop on link click, not card click
                              }}
                              className="flex items-center gap-1 text-[9px] text-gray-700 hover:text-gray-900 hover:underline truncate"
                              title={plan.google_drive_link}
                            >
                              <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">
                                {plan.google_drive_link.length > 30 ? plan.google_drive_link.substring(0, 30) + '...' : plan.google_drive_link}
                              </span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : isCurrentMonth ? (
                <div className="flex-1 flex items-center justify-center opacity-20 hover:opacity-60 transition-opacity">
                  <Plus className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
