import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section/HeaderAndTab';
import { TaskFilters } from './section/TaskFilters';
import { TaskList } from './section/TaskList';
import TaskSummaryCards from './section/TaskSummaryCards';
import { TaskForm } from './section/TaskForm';
import { TaskListFooter } from './section/TaskListFooter';
import { TaskSidebarFooter } from './section/TaskSidebarFooter';
import { DailyTaskProvider, useDailyTask } from './DailyTaskContext';

const DailyTaskContent = () => {
  const { tasks, filters } = useDailyTask();

  // Filter tasks based on filters
  const filteredTasks = tasks.filter(task => {
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status && task.status !== filters.status) {
      return false;
    }
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const thisWeekTasks = tasks.filter(task => {
    const taskDate = new Date(task.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return taskDate >= weekAgo;
  }).length;

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
                {/* Header and Tabs */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeTab="daily-task" 
                    onTabChange={() => {}} 
                  />
                </div>

                {/* Grid Layout: 12 columns (9-3) */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Main Content - 9 columns */}
                  <div className="col-span-9 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                        {/* Filters Section */}
                        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 flex items-center">
                          <TaskFilters />
                        </div>

                        {/* Form Section */}
                        <div className="flex-shrink-0 p-3 border-b border-gray-200">
                          <TaskForm />
                        </div>

                        {/* Scrollable Task Content */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <div className="h-full p-4">
                            <TaskList />
                          </div>
                        </div>

                        {/* Task Footer */}
                        <TaskListFooter 
                          totalTasks={tasks.length}
                          filteredTasks={filteredTasks.length}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar - 3 columns */}
                  <div className="col-span-3 h-full">
                    <div className="bg-white border rounded-lg h-full flex flex-col">
                        {/* Sidebar Header */}
                        <div className="px-4 py-1.5 border-b flex-shrink-0">
                          <h3 className="text-sm font-semibold text-gray-900">Task Summary</h3>
                          <p className="text-xs text-gray-500 mt-1">Overview of daily tasks</p>
                        </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 overflow-y-auto seamless-scroll p-4">
                        <TaskSummaryCards />
                      </div>

                      {/* Sidebar Footer */}
                      <TaskSidebarFooter 
                        totalTasks={tasks.length}
                        thisWeek={thisWeekTasks}
                        completionRate={completionRate}
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

const DailyTaskPage = () => {
  return (
    <DailyTaskProvider>
      <DailyTaskContent />
    </DailyTaskProvider>
  );
};

export default DailyTaskPage;
