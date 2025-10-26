import './MeetingPointsTable.css';

interface MeetingTableFooterProps {
  totalMeetingPoints: number;
  filteredPoints: number;
}

export const MeetingTableFooter = ({ totalMeetingPoints, filteredPoints }: MeetingTableFooterProps) => {
  return (
    <div 
      className="meeting-table-footer px-4 py-2 flex-shrink-0 relative z-10"
      style={{ 
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1)',
        opacity: 1
      }}
    >
      <div className="flex items-center justify-between text-xs text-gray-700">
        <span className="font-semibold text-gray-800">Total Meeting Points: {totalMeetingPoints}</span>
        <span className="text-xs text-gray-600 font-medium">
          {totalMeetingPoints > 0 ? `Showing ${filteredPoints} points` : 'No meeting points yet'}
        </span>
      </div>
    </div>
  );
};

