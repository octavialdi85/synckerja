import React from 'react';
import { useMeetingNotes } from '@/features/8-1-meeting-notes/MeetingNotesContext';
import { LoadingDots } from '@/components/LoadingDots';
import MeetingFilters from './MeetingFilters';
import MeetingNotesInput from './MeetingNotesInput';
import MeetingPointsTable from './MeetingPointsTable';
import MeetingSummaryCards from './MeetingSummaryCards';
import { MeetingTableFooter } from './MeetingTableFooter';

export const MeetingNotesContent = () => {
  const { meetingPoints, filters, isLoading } = useMeetingNotes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 h-full">
        <div className="flex flex-col items-center space-y-3">
          <LoadingDots size="lg" />
          <p className="text-sm text-muted-foreground">Memuat meeting notes...</p>
        </div>
      </div>
    );
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
    <div className="px-3 py-3 space-y-3">
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

      {/* Summary Cards Section */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-2.5 py-2.5">
          <MeetingSummaryCards />
        </div>
      </div>
    </div>
  );
};

