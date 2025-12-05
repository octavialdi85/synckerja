import { memo, useMemo, useCallback, useState } from 'react';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { ScrollArea } from '@/features/ui/scroll-area';
import { History, Clock, User } from 'lucide-react';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';
import { CustomerServiceTicketActionsDropdown } from '../CustomerServiceTicketActionsDropdown';
import { EditTicketDialog } from '../EditTicketDialog';
import { toast } from 'sonner';
import { LoadingDots } from '@/components/LoadingDots';
import { CustomerServiceTicketsTableFooter } from './CustomerServiceTicketsTableFooter';

interface CustomerServiceTicketsTableProps {
  tickets?: any[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Mock update history data
const mockUpdateHistory: Record<string, any[]> = {
  '1': [{
    id: '1',
    type: 'System Update',
    details: 'Network diagnostics completed successfully',
    timestamp: 'Jul 10, 2025, 17:02',
    status: 'Latest'
  }, {
    id: '2',
    type: 'System Update',
    details: 'Initial troubleshooting started',
    timestamp: 'Jul 10, 2025, 16:45'
  }],
  '2': [{
    id: '3',
    type: 'Progress Update',
    details: 'Bug reproduction successful, working on fix',
    timestamp: 'Jul 10, 2025, 15:30'
  }]
};

// Memoized row component for performance
const TicketRow = memo(({ 
  ticket, 
  onRefresh, 
  onEdit
}: {
  ticket: any;
  onRefresh?: () => void;
  onEdit: (ticketId: string) => void;
}) => {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  const getStatusColor = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'open':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  }, []);

  const handleAddUpdate = useCallback((ticketId: string) => {
    console.log('Adding update for ticket:', ticketId, updateText, updateStatus);
    setUpdateText('');
    setUpdateStatus('');
  }, [updateText, updateStatus]);

  return (
    <TableRow className="hover:bg-gray-50/50 h-12 transition-colors">
      <TableCell className="w-32 px-3 text-sm whitespace-nowrap">
        {formatDate(ticket.created_at)}
      </TableCell>
      <TableCell className="w-28 px-3">
        <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded whitespace-nowrap text-blue-600">
          {ticket.ticket_id ? ticket.ticket_id.split('-').slice(-1)[0] : 'N/A'}
        </span>
      </TableCell>
      <TableCell className="w-40 px-3 text-sm">
        <span className="truncate block" title={ticket.customer_name || '-'}>
          {ticket.customer_name || '-'}
        </span>
      </TableCell>
      <TableCell className="w-48 px-3 text-sm">
        <span className="truncate block" title={ticket.title || '-'}>
          {ticket.title || '-'}
        </span>
      </TableCell>
      <TableCell className="w-36 px-3 text-sm">
        <span className="truncate block" title={ticket.category || '-'}>
          {ticket.category || '-'}
        </span>
      </TableCell>
      <TableCell className="w-40 px-3 text-sm">
        <span className="truncate block" title={ticket.description?.substring(0, 50) || '-'}>
          {ticket.description?.substring(0, 30) || '-'}...
        </span>
      </TableCell>
      <TableCell className="w-36 px-3 text-sm">
        <span className="truncate block" title={ticket.assigned_to || 'Unassigned'}>
          {ticket.assigned_to || 'Unassigned'}
        </span>
      </TableCell>
      <TableCell className="w-32 px-3">
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <History className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Update History
                  </DialogTitle>
                </div>
                <p className="text-sm text-gray-600">{ticket.ticket_id}</p>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Add Progress Update Section */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600">+</span>
                    <span className="font-medium text-blue-600">Add Progress Update</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Update Details
                      </label>
                      <Textarea 
                        placeholder="Describe the progress or changes made..." 
                        value={updateText} 
                        onChange={e => setUpdateText(e.target.value)} 
                        className="min-h-[80px]" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Update Status (Optional)
                      </label>
                      <Select value={updateStatus} onValueChange={setUpdateStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Keep current status or change..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={() => handleAddUpdate(ticket.id)} className="bg-blue-600 hover:bg-blue-700">
                      Add Update
                    </Button>
                  </div>
                </div>

                {/* Update History Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Update History ({mockUpdateHistory[ticket.id]?.length || 0})</span>
                  </div>
                  
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-3">
                      {mockUpdateHistory[ticket.id]?.map(update => (
                        <div key={update.id} className="border rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-1 text-gray-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{update.type}</span>
                                {update.status === 'Latest' && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{update.details}</p>
                              <p className="text-xs text-gray-500">{update.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!mockUpdateHistory[ticket.id] || mockUpdateHistory[ticket.id]?.length === 0) && (
                        <p className="text-sm text-gray-500 text-center py-4">No update history available</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <span className="text-sm font-medium">0</span>
        </div>
      </TableCell>
      <TableCell className="w-32 px-3">
        <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-2 py-1 border`}>
          {ticket.priority || 'Medium'}
        </Badge>
      </TableCell>
      <TableCell className="w-32 px-3">
        <Badge className={`${getStatusColor(ticket.status)} text-xs px-2 py-1 border`}>
          {ticket.status || 'New'}
        </Badge>
      </TableCell>
      <TableCell className="w-24 px-3">
        <CustomerServiceTicketActionsDropdown
          onEdit={() => onEdit(ticket.id)}
          onDelete={() => {
            if (window.confirm('Are you sure you want to delete this ticket?')) {
              // Handle delete
              toast.success('Ticket deleted successfully');
            }
          }}
        />
      </TableCell>
    </TableRow>
  );
});

TicketRow.displayName = 'TicketRow';

export const CustomerServiceTicketsTable = memo(({ 
  tickets: propTickets, 
  onRefresh,
  isLoading = false
}: CustomerServiceTicketsTableProps) => {
  const { tickets: hookTickets = [], isLoading: hookLoading } = useCustomerServiceTickets();
  const tickets = propTickets || hookTickets;
  const isActuallyLoading = isLoading || hookLoading;
  const [editingTicket, setEditingTicket] = useState<any>(null);

  // Memoize the table headers to prevent re-renders
  const tableHeaders = useMemo(() => [
    { key: 'created', label: 'Created', width: 'w-32' },
    { key: 'ticket_id', label: 'Ticket ID', width: 'w-28' },
    { key: 'customer', label: 'Customer', width: 'w-40' },
    { key: 'title', label: 'Title', width: 'w-48' },
    { key: 'category', label: 'Category', width: 'w-36' },
    { key: 'description', label: 'Description', width: 'w-40' },
    { key: 'assignee', label: 'Assignee', width: 'w-36' },
    { key: 'follow_up', label: 'Follow Up', width: 'w-32' },
    { key: 'priority', label: 'Priority', width: 'w-32' },
    { key: 'status', label: 'Status', width: 'w-32' },
    { key: 'actions', label: 'Actions', width: 'w-24' },
  ], []);

  const handleEditTicket = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setEditingTicket(ticket);
    }
  }, [tickets]);

  const renderTicketRows = useMemo(() => (
    tickets.map((ticket) => (
      <TicketRow
        key={ticket.id}
        ticket={ticket}
        onRefresh={onRefresh}
        onEdit={handleEditTicket}
      />
    ))
  ), [tickets, onRefresh, handleEditTicket]);

  const resolvedTickets = useMemo(() => 
    tickets.filter(t => t.status === 'Resolved' || t.status === 'resolved' || t.status === 'Closed' || t.status === 'closed').length,
    [tickets]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 seamless-scroll overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
            <TableRow className="hover:bg-transparent">
              {tableHeaders.map((header) => (
                <TableHead key={header.key} className={`text-xs font-medium text-gray-700 ${header.width} px-3 bg-gray-50 whitespace-nowrap`}>
                  {header.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isActuallyLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <div className="flex items-center justify-center">
                    <LoadingDots size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-gray-500 text-sm">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-lg">🎫</div>
                    <div>No tickets found</div>
                    <div className="text-xs text-gray-400">Try adjusting your filters or search terms</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              renderTicketRows
            )}
          </TableBody>
        </table>
      </div>

      {/* Table Footer */}
      <CustomerServiceTicketsTableFooter 
        totalTickets={tickets.length}
        resolvedTickets={resolvedTickets}
        filteredTickets={tickets.length}
        selectedCategory="all"
      />

      <EditTicketDialog 
        open={!!editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
        ticket={editingTicket}
      />
    </div>
  );
});

CustomerServiceTicketsTable.displayName = 'CustomerServiceTicketsTable';

