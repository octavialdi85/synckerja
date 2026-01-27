import React, { useMemo } from 'react';
import { GanttTask } from '../types/ganttTypes';
import { format, addDays, startOfDay, endOfDay, isSameDay } from 'date-fns';

interface GanttChartViewProps {
  tasks: GanttTask[];
}

export const GanttChartView: React.FC<GanttChartViewProps> = ({ tasks }) => {
  // Calculate date range from tasks
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: startOfDay(today),
        end: startOfDay(addDays(today, 30)),
      };
    }

    const dates = tasks.flatMap(task => [task.startDate, task.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add some padding before and after
    return {
      start: startOfDay(addDays(minDate, -7)), // 7 days before earliest task
      end: startOfDay(addDays(maxDate, 7)), // 7 days after latest task
    };
  }, [tasks]);

  // Generate date columns (days)
  const days = useMemo(() => {
    const days: Date[] = [];
    let current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    return days;
  }, [dateRange]);

  // Calculate task position and width based on day columns
  const getTaskStyle = (task: GanttTask) => {
    const taskStart = startOfDay(task.startDate);
    const taskEnd = startOfDay(task.endDate);
    
    // Find the index of the start day (first day that matches or is after task start)
    let startDayIndex = -1;
    for (let i = 0; i < days.length; i++) {
      const dayTime = startOfDay(days[i]).getTime();
      if (dayTime >= taskStart.getTime()) {
        startDayIndex = i;
        break;
      }
    }
    
    // Find the index of the end day (first day that is after task end)
    let endDayIndex = -1;
    for (let i = 0; i < days.length; i++) {
      const dayTime = startOfDay(days[i]).getTime();
      if (dayTime > taskEnd.getTime()) {
        endDayIndex = i;
        break;
      }
    }
    
    // If not found, use fallback
    const startIdx = startDayIndex >= 0 ? startDayIndex : 0;
    const endIdx = endDayIndex >= 0 ? endDayIndex : days.length;
    
    // Calculate position based on day index and column width (60px)
    const columnWidth = 60; // px - must match minWidth in header
    const left = startIdx * columnWidth;
    // Width should span from start day to end day (inclusive)
    // If task ends on a specific day, include that day
    const numDays = Math.max(1, endIdx - startIdx);
    const width = numDays * columnWidth;

    return {
      left: `${left}px`,
      width: `${width}px`,
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="w-full h-full bg-white border rounded-lg p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-sm">No tasks found</p>
          <p className="text-xs text-gray-400 mt-2">
            Tasks from Daily Task will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded-lg overflow-auto seamless-scroll" style={{ border: '2px solid #d1d5db' }}>
      <div className="min-w-full">
        {/* Header with dates */}
        <div className="sticky top-0 bg-gray-50 border-b-2 border-gray-300 z-10 shadow-sm">
          <div className="flex">
            <div className="w-64 flex-shrink-0 border-r-2 border-gray-300 p-3 font-semibold text-sm text-gray-700 bg-gray-50" style={{ borderRight: '2px solid #d1d5db' }}>
              Task
            </div>
            <div className="flex-1 flex">
              {days.map((day, idx) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Sunday or Saturday
                return (
                  <div
                    key={idx}
                    className="border-r-2 border-gray-300 p-1.5 text-xs text-center bg-gray-50"
                    style={{ 
                      minWidth: '60px',
                      backgroundColor: isWeekend ? '#f3f4f6' : '#f9fafb',
                      borderRight: '2px solid #d1d5db'
                    }}
                  >
                    <div className="font-medium text-gray-700">
                      {format(day, 'd')}
                    </div>
                    <div className="text-gray-500 text-[10px] mt-0.5">
                      {format(day, 'MMM')}
                    </div>
                    <div className="text-gray-400 text-[9px] mt-0.5">
                      {format(day, 'EEE')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task rows - Group by task, then show steps */}
        <div className="relative border-t-2 border-gray-300" style={{ borderTop: '2px solid #d1d5db' }}>
          {(() => {
            // Group tasks by projectId (which is the parent task ID)
            const taskGroups = new Map<string, { task: GanttTask; steps: GanttTask[] }>();
            
            // First, add all tasks
            tasks.forEach((item) => {
              if (item.isTask) {
                // This is a task
                if (!taskGroups.has(item.id)) {
                  taskGroups.set(item.id, { task: item, steps: [] });
                }
              }
            });
            
            // Then, add all steps to their parent tasks
            tasks.forEach((item) => {
              if (item.isStep && item.parentTaskId) {
                // This is a step
                if (taskGroups.has(item.parentTaskId)) {
                  taskGroups.get(item.parentTaskId)!.steps.push(item);
                } else {
                  // If parent task not found, create a group for it
                  const parentTask = tasks.find(t => t.id === item.parentTaskId && t.isTask);
                  if (parentTask) {
                    taskGroups.set(item.parentTaskId, { task: parentTask, steps: [item] });
                  }
                }
              }
            });
            
            // Sort steps by order (if available) or by start date
            taskGroups.forEach((group) => {
              group.steps.sort((a, b) => {
                return a.startDate.getTime() - b.startDate.getTime();
              });
            });

            // Convert Map to Array and sort by task start date
            const sortedGroups = Array.from(taskGroups.values()).sort((a, b) => {
              return a.task.startDate.getTime() - b.task.startDate.getTime();
            });

            // Render grouped tasks
            const result: React.ReactNode[] = [];
            sortedGroups.forEach((group) => {
              const taskStyle = getTaskStyle(group.task);
              
              // Render task
              result.push(
                <div
                  key={group.task.id}
                  className="flex border-b-2 border-gray-300 hover:bg-blue-50 transition-colors"
                  style={{ 
                    minHeight: '48px', 
                    borderBottom: '2px solid #d1d5db', 
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e5e7eb'
                  }}
                >
                  {/* Task name column */}
                  <div className="w-64 flex-shrink-0 border-r-2 border-gray-300 p-3 flex items-center bg-white" style={{ borderRight: '2px solid #d1d5db', backgroundColor: '#ffffff' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate" title={group.task.title}>
                        {group.task.title}
                      </div>
                      {group.task.assigneeName && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          👤 {group.task.assigneeName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative bg-white" style={{ minHeight: '48px', backgroundColor: '#ffffff' }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {days.map((day, idx) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={idx}
                            className="border-r-2 border-gray-200"
                            style={{ 
                              minWidth: '60px',
                              backgroundColor: isWeekend ? '#f9fafb' : 'transparent',
                              borderRight: '2px solid #e5e7eb'
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Task bar */}
                    <div
                      className="absolute top-2 bottom-2 rounded-md flex items-center px-2 shadow-sm border border-opacity-20"
                      style={{
                        ...taskStyle,
                        backgroundColor: group.task.color || '#3b82f6',
                        minWidth: '60px',
                        borderColor: group.task.color || '#3b82f6',
                      }}
                      title={`${group.task.title} - ${group.task.progress}% complete`}
                    >
                      {/* Progress indicator */}
                      {group.task.progress > 0 && (
                        <div
                          className="h-full bg-white bg-opacity-40 rounded-l-md"
                          style={{ width: `${group.task.progress}%` }}
                        />
                      )}
                      {/* Task label on bar - only show if bar is wide enough */}
                      {parseFloat(taskStyle.width.replace('px', '')) > 60 && (
                        <span className="text-xs text-white font-medium ml-1 truncate flex-1 text-shadow-sm">
                          {group.task.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );

              // Render steps for this task
              group.steps.forEach((step) => {
                const stepStyle = getTaskStyle(step);
                result.push(
                  <div
                    key={step.id}
                    className="flex border-b-2 border-gray-200 hover:bg-gray-100 transition-colors"
                    style={{ 
                      minHeight: '40px', 
                      borderBottom: '2px solid #e5e7eb', 
                      backgroundColor: '#f3f4f6',
                      borderTop: '1px solid #d1d5db'
                    }}
                  >
                    {/* Step name column with indent */}
                    <div className="w-64 flex-shrink-0 border-r-2 border-gray-300 p-2 pl-6 flex items-center" style={{ borderRight: '2px solid #d1d5db', backgroundColor: '#f3f4f6' }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-normal text-sm text-gray-700 truncate flex items-center gap-1" title={step.title}>
                          <span className="text-xs">└─</span>
                          <span>{step.title}</span>
                        </div>
                        {step.assigneeName && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            👤 {step.assigneeName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gantt bar area for step */}
                    <div className="flex-1 relative" style={{ minHeight: '40px', backgroundColor: '#f3f4f6' }}>
                      {/* Background grid */}
                      <div className="absolute inset-0 flex">
                        {days.map((day, idx) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={idx}
                              className="border-r-2 border-gray-200"
                              style={{ 
                                minWidth: '60px',
                                backgroundColor: isWeekend ? '#f3f4f6' : 'transparent',
                                borderRight: '2px solid #e5e7eb'
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Step bar */}
                      <div
                        className="absolute top-2 bottom-2 rounded-md flex items-center px-1.5 shadow-sm border border-opacity-20"
                        style={{
                          ...stepStyle,
                          backgroundColor: step.color || '#94a3b8',
                          minWidth: '60px',
                          borderColor: step.color || '#94a3b8',
                        }}
                        title={`${step.title} - ${step.progress}% complete`}
                      >
                        {/* Progress indicator */}
                        {step.progress > 0 && (
                          <div
                            className="h-full bg-white bg-opacity-40 rounded-l-md"
                            style={{ width: `${step.progress}%` }}
                          />
                        )}
                        {/* Step label on bar - only show if bar is wide enough */}
                        {parseFloat(stepStyle.width.replace('px', '')) > 60 && (
                          <span className="text-[10px] text-white font-medium ml-1 truncate flex-1">
                            {step.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            });

            return result;
          })()}
        </div>
      </div>
    </div>
  );
};
