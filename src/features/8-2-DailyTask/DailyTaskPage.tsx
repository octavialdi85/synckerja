import React, { useState } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section/HeaderAndTab';
import { TaskFilters } from './section/TaskFilters';
import { TaskList } from './section/TaskList';
import TaskSummaryCards from './section/TaskSummaryCards';
import TaskInitiative, { InitiativeStats } from './section/TaskInitiative';
import { TaskListFooter } from './section/TaskListFooter';
import { TaskSidebarFooter } from './section/TaskSidebarFooter';
import { TaskInitiativeFooter } from './section/TaskInitiativeFooter';
import { DailyTaskProvider, useDailyTask } from './DailyTaskContext';
import { MeetingNotesProvider } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';
import { JobDescTracker } from './section/JobDescTracker';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const DailyTaskPage = () => {
  return (
    <MeetingNotesProvider>
      <DailyTaskProvider>
        <DailyTaskContent />
      </DailyTaskProvider>
    </MeetingNotesProvider>
  );
};

const DailyTaskContent = () => {
  const { t } = useAppTranslation();
  const { tasks, filters, isLoading } = useDailyTask();
  const [sidebarTab, setSidebarTab] = useState<'summary' | 'initiative' | 'jobdesc'>('summary');
  const [initiativeStats, setInitiativeStats] = useState<InitiativeStats>({ totalItems: 0, unassignedItems: 0 });
  const [initialLoadTimeout, setInitialLoadTimeout] = useState(false);

  // OPTIMIZATION: Show skeleton UI after 500ms even if still loading
  // This prevents blank screen during slow queries
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadTimeout(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state only on initial load (before timeout)
  // After timeout, show skeleton UI instead of full loading screen
  if (isLoading && !initialLoadTimeout) {
    return (
      <StandardLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <LoadingDots size="lg" />
            <p className="text-sm text-gray-600">Memuat halaman...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Filter tasks based on filters
  const filteredTasks = tasks.filter(task => {
    // Search filter - now includes both task title, description and step titles
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const taskTitleMatch = task.title?.toLowerCase().includes(searchTerm) || false;
      const taskDescriptionMatch = task.description?.toLowerCase().includes(searchTerm) || false;
      const stepMatch = task.steps?.some(step => 
        step.title?.toLowerCase().includes(searchTerm)
      ) || false;
      
      if (!taskTitleMatch && !taskDescriptionMatch && !stepMatch) {
        return false;
      }
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
                  <div className="col-span-9 flex flex-col min-h-0 gap-2">
                    <div className="flex-shrink-0">
                      <TaskFilters />
                    </div>
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
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
                  <div className="col-span-3 h-full max-h-[calc(100vh-120px)]">
                    <div className="bg-white border rounded-lg h-full flex flex-col">
                        {/* Sidebar Header with Tabs */}
                        <div className="border-b flex-shrink-0">
                          {/* Tab Buttons */}
                          <div className="flex border-b border-gray-200">
                            <button
                              onClick={() => setSidebarTab('summary')}
                              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                sidebarTab === 'summary'
                                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {t('dailyTask.sidebar.summaryTab', 'Task Summary')}
                            </button>
                            <button
                              onClick={() => setSidebarTab('initiative')}
                              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                sidebarTab === 'initiative'
                                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {t('dailyTask.sidebar.initiativeTab', 'Initiative')}
                            </button>
                            <button
                              onClick={() => setSidebarTab('jobdesc')}
                              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                sidebarTab === 'jobdesc'
                                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {t('dailyTask.sidebar.jobDescTab', 'Job Desc')}
                            </button>
                          </div>
                          
                        </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 overflow-y-auto seamless-scroll p-4">
                        {sidebarTab === 'summary' && <TaskSummaryCards />}
                        {sidebarTab === 'initiative' && (
                          <TaskInitiative onStatsChange={setInitiativeStats} />
                        )}
                        {sidebarTab === 'jobdesc' && <JobDescTracker />}
                      </div>

                      {/* Sidebar Footer - Conditional based on active tab */}
                      {sidebarTab === 'summary' && (
                        <TaskSidebarFooter 
                          totalTasks={tasks.length}
                          thisWeek={thisWeekTasks}
                          completionRate={completionRate}
                        />
                      )}
                      {sidebarTab === 'initiative' && (
                        <TaskInitiativeFooter 
                          totalItems={initiativeStats.totalItems}
                          unassignedItems={initiativeStats.unassignedItems}
                        />
                      )}
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

export default DailyTaskPage;
