import React from 'react';
import { Plus } from 'lucide-react';
import { isSameDay } from 'date-fns';

const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface CalendarGridProps {
  calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>;
  getDayInfo: (date: Date) => any;
  onDayClick: (date: Date, dayInfo: any) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarDays,
  getDayInfo,
  onDayClick
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
                ${dayInfo.color}
                hover:shadow-md hover:scale-105 transition-all duration-200
              `}
            >
              <div className="font-medium text-sm mb-1">
                {date.getDate()}
              </div>
              
              {dayInfo.count > 0 ? (
                <div className="flex-1 space-y-1 overflow-y-auto seamless-scroll">
                  {dayInfo.plans.map((plan: any, planIndex: number) => (
                    <div key={planIndex} className={`text-xs space-y-0.5 p-1 rounded ${
                      dayInfo.status === 'completed' ? 'bg-green-50 border border-green-200' :
                      dayInfo.status === 'revision' ? 'bg-yellow-50 border border-yellow-200' :
                      dayInfo.status === 'overdue' ? 'bg-red-50 border border-red-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      {/* Service - Sub Service - Pillar */}
                      <div className={`truncate text-[10px] ${
                        dayInfo.status === 'completed' ? 'text-green-700' :
                        dayInfo.status === 'revision' ? 'text-yellow-700' :
                        dayInfo.status === 'overdue' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        {[
                          plan.service?.name,
                          plan.sub_service?.name,
                          plan.content_pillar?.name
                        ].filter(Boolean).join(' - ') || 'No Service'}
                      </div>
                      
                      {/* Title */}
                      <div className={`font-medium truncate ${
                        dayInfo.status === 'completed' ? 'text-green-900' :
                        dayInfo.status === 'revision' ? 'text-yellow-900' :
                        dayInfo.status === 'overdue' ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {plan.title || 'Untitled'}
                      </div>
                      
                      {/* PIC */}
                      <div className={`truncate text-[10px] ${
                        dayInfo.status === 'completed' ? 'text-green-600' :
                        dayInfo.status === 'revision' ? 'text-yellow-600' :
                        dayInfo.status === 'overdue' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        PIC: {plan.pic?.full_name || 'Unassigned'}
                      </div>
                    </div>
                  ))}
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
