import './MeetingPointsTable.css';

interface MeetingTableFooterProps {
  totalMeetingPoints: number;
  filteredPoints: number;
}

export const MeetingTableFooter = ({ totalMeetingPoints, filteredPoints }: MeetingTableFooterProps) => {
  return (
    <div className="flex-shrink-0 px-2.5 py-1.5 border-t border-border bg-muted/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs text-muted-foreground">
        <span className="break-words">Total Meeting Points: {totalMeetingPoints}</span>
        <span className="text-xs text-muted-foreground">
          {totalMeetingPoints > 0 ? `Showing ${filteredPoints} points` : 'No meeting points yet'}
        </span>
      </div>
    </div>
  );
};

