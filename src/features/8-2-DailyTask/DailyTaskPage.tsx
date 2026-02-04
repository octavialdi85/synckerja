import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, filteredTasks, isLoading, setFilters, setExpandedTasks, setHighlightedTask, scrollToStep } = useDailyTask();
  const [sidebarTab, setSidebarTab] = useState<'summary' | 'initiative' | 'jobdesc'>('summary');
  const [initiativeStats, setInitiativeStats] = useState<InitiativeStats>({ totalItems: 0, unassignedItems: 0 });
  const [initialLoadTimeout, setInitialLoadTimeout] = useState(false);
  const appliedNavParamsRef = useRef(false);

  // Very short loading only when organizationId not ready yet (avoids flash)
  React.useEffect(() => {
    const timer = setTimeout(() => setInitialLoadTimeout(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Apply URL params from Home (standalone SectionActivityNotifikasi) after tasks are loaded
  useEffect(() => {
    if (isLoading || tasks.length === 0 || appliedNavParamsRef.current) return;
    const taskId = searchParams.get('taskId');
    const stepId = searchParams.get('stepId');
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    if (!taskId) return;

    appliedNavParamsRef.current = true;
    if (search) setFilters(prev => ({ ...prev, search }));
    setExpandedTasks(prev => new Set([...prev, taskId]));
    setHighlightedTask(taskId);
    setTimeout(() => setHighlightedTask(null), 3000);
    if (action === 'scroll' && stepId) {
      setTimeout(() => scrollToStep(stepId), 400);
    }
    setSearchParams({}, { replace: true });
  }, [isLoading, tasks.length, searchParams, setFilters, setExpandedTasks, setHighlightedTask, scrollToStep, setSearchParams]);

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

  // Statistics from filtered tasks so sidebar responds to filters
  const thisWeekTasks = filteredTasks.filter(task => {
    const taskDate = new Date(task.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return taskDate >= weekAgo;
  }).length;

  const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;

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
                          totalTasks={filteredTasks.length}
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
