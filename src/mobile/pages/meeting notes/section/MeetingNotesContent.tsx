import React from 'react';
import { useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { MeetingNotesPageSkeleton } from '../MeetingNotesPageSkeleton';
import MeetingFilters from './MeetingFilters';
import MeetingNotesInput from './MeetingNotesInput';
import MeetingPointsTable from './MeetingPointsTable';
import MeetingSummaryCards from './MeetingSummaryCards';
import { MeetingTableFooter } from './MeetingTableFooter';

export const MeetingNotesContent = () => {
  const { meetingPoints, filters, isLoading } = useMeetingNotes();

  if (isLoading) {
    return <MeetingNotesPageSkeleton />;
  }

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

  return (
    <div className="mx-auto w-full max-w-md px-2 pt-2 space-y-3 min-h-0 shrink-0 content-padding-above-nav-meeting-notes">
      {/* Filters Section */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-border">
          <MeetingFilters />
        </div>

        {/* Input Section */}
        <div className="px-2.5 py-1.5 border-b border-border">
          <MeetingNotesInput />
        </div>

        {/* Table Section - Scrollable */}
        <div className="overflow-y-auto seamless-scroll max-h-[calc(100vh-420px)]">
          <div className="px-2 py-2">
            <MeetingPointsTable />
          </div>
        </div>

        {/* Table Footer */}
        <div className="border-t border-border">
          <MeetingTableFooter 
            totalMeetingPoints={meetingPoints.length} 
            filteredPoints={filteredPoints.length} 
          />
        </div>
      </div>

      {/* Summary Cards Section - mb-6 matches spacing from header to first section so last section is not flush with footer nav */}
      <div className="bg-card border border-border rounded-lg shadow-sm mb-6">
        <div className="px-2.5 py-2.5">
          <MeetingSummaryCards />
        </div>
      </div>
    </div>
  );
};

