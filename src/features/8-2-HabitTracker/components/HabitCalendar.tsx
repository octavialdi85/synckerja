import React, { useState } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export const HabitCalendar = () => {
  const { entries, habits } = useHabitTracker();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter((e) => e.entry_date === dateStr);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={goToPreviousMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={goToNextMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto seamless-scroll">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day) => {
            const dayEntries = getEntriesForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                className={`
                  aspect-square p-1 rounded border
                  ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
                  ${dayEntries.length > 0 ? 'bg-green-50 border-green-200' : ''}
                `}
              >
                <div className="text-xs font-medium mb-1">
                  {format(day, 'd')}
                </div>
                {dayEntries.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayEntries.slice(0, 3).map((entry) => {
                      const habit = habits.find((h) => h.id === entry.habit_id);
                      return (
                        <div
                          key={entry.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: habit?.color || '#3b82f6' }}
                          title={habit?.name}
                        />
                      );
                    })}
                    {dayEntries.length > 3 && (
                      <div className="text-[8px] text-gray-500">+{dayEntries.length - 3}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Legend:</p>
          <div className="flex flex-wrap gap-2">
            {habits.slice(0, 5).map((habit) => (
              <div key={habit.id} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: habit.color || '#3b82f6' }}
                />
                <span className="text-xs text-gray-600">{habit.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
