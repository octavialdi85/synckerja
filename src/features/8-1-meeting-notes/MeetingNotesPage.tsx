import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
  MeetingFilters,
  MeetingPointsTable,
  MeetingSummaryCards,
  MeetingNotesInput,
  MeetingTableFooter,
  MeetingSidebarFooter
} from './section';
import { MeetingNotesProvider, useMeetingNotes } from './MeetingNotesContext';

const MeetingNotesContent = () => {
  const { meetingPoints, filters } = useMeetingNotes();

  // Filter meeting points based on filters
  const filteredPoints = meetingPoints.filter(point => {
    if (filters.search && !point.discussion_point.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status && point.status !== filters.status) {
      return false;
    }
    if (filters.requestBy && point.request_by !== filters.requestBy) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const thisMonthPoints = meetingPoints.filter(point => {
    const pointDate = new Date(point.meeting_date);
    const now = new Date();
    return pointDate.getMonth() === now.getMonth() && pointDate.getFullYear() === now.getFullYear();
  }).length;

  const completedPoints = meetingPoints.filter(point => point.status === 'Completed').length;
  const completionRate = meetingPoints.length > 0 ? Math.round((completedPoints / meetingPoints.length) * 100) : 0;

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
                {/* Header and Tabs */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeTab="meeting-notes" 
                    onTabChange={() => {}} 
                  />
                </div>

                {/* Grid Layout: 12 columns (9-3) */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Main Content - 9 columns */}
                  <div className="col-span-9 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-180px)]">
                        {/* Filters Section */}
                        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 flex items-center">
                          <MeetingFilters />
                        </div>

                        {/* Input Section */}
                        <div className="flex-shrink-0 p-3 border-b border-gray-200">
                          <MeetingNotesInput />
                        </div>

                        {/* Scrollable Table Content */}
                        <div className="flex-1 min-h-0 p-4">
                          <MeetingPointsTable />
                        </div>

                        {/* Table Footer */}
                        <MeetingTableFooter 
                          totalMeetingPoints={meetingPoints.length}
                          filteredPoints={filteredPoints.length}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar - 3 columns */}
                  <div className="col-span-3 h-full">
                    <div className="bg-white border rounded-lg h-full flex flex-col max-h-[calc(100vh-180px)]">
                        {/* Sidebar Header */}
                        <div className="px-4 py-1.5 border-b flex-shrink-0">
                          <h3 className="text-sm font-semibold text-gray-900">Meeting Summary</h3>
                          <p className="text-xs text-gray-500 mt-1">Overview of meeting points</p>
                        </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 overflow-y-auto seamless-scroll p-4">
                        <MeetingSummaryCards />
                      </div>

                      {/* Sidebar Footer */}
                      <MeetingSidebarFooter 
                        totalMeetings={meetingPoints.length}
                        thisMonth={thisMonthPoints}
                        completionRate={completionRate}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

const MeetingNotesPage = () => {
  return (
    <MeetingNotesProvider>
      <MeetingNotesContent />
    </MeetingNotesProvider>
  );
};

export default MeetingNotesPage;




