import React from 'react';
import { Plus } from 'lucide-react';
import { isSameDay } from 'date-fns';

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
                    const approved = plan.approved === true;
                    const productionApproved = plan.production_approved === true;
                    const done = plan.done === true;
                    const onTimeStatus = plan.on_time_status;
                    
                    // Check if on_time_status is not "Ontime" and not NULL/Empty
                    const hasLateStatus = onTimeStatus && 
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
                            plan.service?.name,
                            plan.sub_service?.name,
                            plan.content_pillar?.name
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
                          {plan.title || 'Untitled'}
                        </div>
                        
                        {/* PIC */}
                        <div className={`truncate text-[10px] ${
                          planStatus === 'green' ? 'text-emerald-100' :
                          planStatus === 'yellow' ? 'text-gray-700' :
                          planStatus === 'orange' ? 'text-orange-100' :
                          planStatus === 'red' ? 'text-red-100' :
                          'text-blue-600'
                        }`}>
                          PIC: {plan.pic?.full_name || 'Unassigned'}
                        </div>
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
