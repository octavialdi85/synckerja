
import { useState } from 'react';
import { Edit, Trash2, History, MoreHorizontal, User, Clock } from 'lucide-react';
import { Button } from '@/features/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/features/ui/tooltip';
import { useMeetingNotes } from '../MeetingNotesContext';
import EditMeetingPointDialog from '../modal/EditMeetingPointDialog';
import DeleteMeetingPointDialog from '../modal/DeleteMeetingPointDialog';
import UpdateHistoryDialog from '../modal/UpdateHistoryDialog';
import './MeetingPointsTable.css';

const MeetingPointsTable = () => {
  const { meetingPoints, filters, updateMeetingPoint, deleteMeetingPoint, getUpdateCount } = useMeetingNotes();
  const [editingPoint, setEditingPoint] = useState<any>(null);
  const [deletingPoint, setDeletingPoint] = useState<any>(null);
  const [historyPoint, setHistoryPoint] = useState<any>(null);

  console.log('Meeting points in table:', meetingPoints); // Debug log

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Not Started': 'bg-orange-100 text-orange-700 border-orange-200',
      'On Going': 'bg-blue-100 text-blue-700 border-blue-200',
      'Completed': 'bg-green-100 text-green-700 border-green-200',
      'Rejected': 'bg-red-100 text-red-700 border-red-200',
      'Presented': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    
    return (
      <Badge className={`${variants[status] || ''} px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap`}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleEdit = (point: any) => {
    setEditingPoint(point);
  };

  const handleDelete = (point: any) => {
    setDeletingPoint(point);
  };

  const handleShowHistory = (point: any) => {
    setHistoryPoint(point);
  };

  const handleEditSuccess = async (id: string, data: any) => {
    await updateMeetingPoint(id, data);
    setEditingPoint(null);
  };

  const handleDeleteSuccess = async (id: string) => {
    await deleteMeetingPoint(id);
    setDeletingPoint(null);
  };

  return (
    <>
      <TooltipProvider>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
          <div className="overflow-x-auto overflow-y-auto seamless-scroll flex-1 min-h-0">
            <Table className="meeting-points-table">
              <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>
                    Date
                  </TableHead>
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '400px', minWidth: '400px', maxWidth: '400px' }}>
                    Discussion Point
                  </TableHead>
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>
                    Request By
                  </TableHead>
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}>
                    Status
                  </TableHead>
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>
                    Updates
                  </TableHead>
                  <TableHead className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredPoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center">
                      <Clock className="w-8 h-8 mb-2 text-gray-300" />
                      <p>No meeting points found</p>
                      <p className="text-sm text-gray-400">Add a new discussion point to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPoints.map((point) => (
                  <TableRow key={point.id} className="hover:bg-gray-50">
                    <TableCell className="px-2 py-3 text-center text-sm text-gray-600 font-medium">
                      {formatDate(point.meeting_date)}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      {point.discussion_point.length > 80 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="discussion-point-text"
                              onClick={() => handleEdit(point)}
                              title="Click to edit"
                            >
                              {point.discussion_point}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="bottom" 
                            align="start"
                            className="max-w-md p-4 bg-gray-900 text-white shadow-lg border-gray-700"
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {point.discussion_point}
                            </p>
                            <p className="text-xs text-gray-300 mt-2">Click to edit this meeting point</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div 
                          className="discussion-point-text"
                          onClick={() => handleEdit(point)}
                          title="Click to edit"
                        >
                          {point.discussion_point}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="text-sm truncate">{point.request_by || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      {getStatusBadge(point.status)}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowHistory(point)}
                          className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1"
                        >
                          <History className="w-4 h-4" />
                          <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center">
                            {getUpdateCount(point.id)}
                          </span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(point)}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(point)}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TooltipProvider>

      {editingPoint && (
        <EditMeetingPointDialog
          isOpen={!!editingPoint}
          onClose={() => setEditingPoint(null)}
          meetingPoint={editingPoint}
          onEditSuccess={handleEditSuccess}
        />
      )}

      {deletingPoint && (
        <DeleteMeetingPointDialog
          isOpen={!!deletingPoint}
          onClose={() => setDeletingPoint(null)}
          meetingPoint={deletingPoint}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {historyPoint && (
        <UpdateHistoryDialog
          isOpen={!!historyPoint}
          onClose={() => setHistoryPoint(null)}
          discussionPoint={historyPoint.discussion_point}
          meetingPointId={historyPoint.id}
        />
      )}
    </>
  );
};

export default MeetingPointsTable;
