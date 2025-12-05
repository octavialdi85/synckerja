import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Label } from '@/features/ui/label';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Plus, Search, Filter, MoreHorizontal, CalendarIcon, Ticket, Edit, Trash2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useToast } from '@/features/ui/use-toast';
import { useAvailableEmployees } from '@/features/share/hooks/useAvailableEmployees';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_id: string;
  title: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed';
  assigned_to?: string;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

const CustomerServiceDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    category: 'General Inquiry',
    priority: 'Medium',
    status: 'New',
    assigned_to: '',
    assignee_id: '',
  });

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch available employees for assignee dropdown
  const { data: availableEmployees = [] } = useAvailableEmployees();

  // Get user's organization
  const { data: userOrg } = useQuery({
    queryKey: ['user-org', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('Fetching user organization for user:', user.id);
      const { data } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();
      console.log('User organization data:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate preview ticket ID - shorter format
  const generatePreviewTicketId = () => {
    const today = new Date();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return randomNum;
  };

  const [previewTicketId] = useState(generatePreviewTicketId());

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['customer-service-tickets', userOrg?.active_organization_id],
    queryFn: async () => {
      if (!userOrg?.active_organization_id) return [];
      
      console.log('Fetching tickets for organization:', userOrg.active_organization_id);
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .select('*')
        .eq('organization_id', userOrg.active_organization_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }
      console.log('Tickets fetched:', data?.length || 0);
      return data as Ticket[];
    },
    enabled: !!userOrg?.active_organization_id,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: {
      title: string;
      description?: string;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      category: string;
      priority: 'Low' | 'Medium' | 'High' | 'Critical';
      status: 'New' | 'In Progress' | 'Resolved' | 'Closed';
      assigned_to?: string | null;
      assignee_id?: string | null;
      due_date?: string | null;
      organization_id: string;
    }) => {
      console.log('Creating ticket with data:', ticketData);
      console.log('Organization ID:', ticketData.organization_id);
      
      // Don't send ticket_id - let the database trigger generate it
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .insert(ticketData)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('Ticket created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Ticket creation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        category: 'General Inquiry',
        priority: 'Medium',
        status: 'New',
        assigned_to: '',
        assignee_id: '',
      });
      setDueDate(undefined);
      toast({
        title: 'Success',
        description: `Ticket ${data.ticket_id} created successfully!`,
      });
    },
    onError: (error: any) => {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      console.log('Deleting ticket:', ticketId);
      const { error } = await supabase
        .from('customer_service_tickets')
        .delete()
        .eq('id', ticketId);
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      return ticketId;
    },
    onSuccess: () => {
      console.log('Ticket deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
      toast({
        title: 'Success',
        description: 'Ticket deleted successfully!',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ticket',
        variant: 'destructive',
      });
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (ticketData: {
      id: string;
      title: string;
      description?: string;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      category: string;
      priority: 'Low' | 'Medium' | 'High' | 'Critical';
      status: 'New' | 'In Progress' | 'Resolved' | 'Closed';
      assigned_to?: string | null;
      assignee_id?: string | null;
      due_date?: string | null;
    }) => {
      console.log('Updating ticket with data:', ticketData);
      
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .update({
          title: ticketData.title,
          description: ticketData.description || null,
          customer_name: ticketData.customer_name,
          customer_email: ticketData.customer_email || null,
          customer_phone: ticketData.customer_phone || null,
          category: ticketData.category,
          priority: ticketData.priority,
          status: ticketData.status,
          assigned_to: ticketData.assigned_to || null,
          assignee_id: ticketData.assignee_id || null,
          due_date: ticketData.due_date || null,
        })
        .eq('id', ticketData.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Ticket updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Ticket update successful');
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
      setIsEditDialogOpen(false);
      setEditingTicket(null);
      setFormData({
        title: '',
        description: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        category: 'General Inquiry',
        priority: 'Medium',
        status: 'New',
        assigned_to: '',
        assignee_id: '',
      });
      setDueDate(undefined);
      toast({
        title: 'Success',
        description: `Ticket ${data.ticket_id} updated successfully!`,
      });
    },
    onError: (error: any) => {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    },
  });

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email || '',
      customer_phone: ticket.customer_phone || '',
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assigned_to: ticket.assigned_to || '',
      assignee_id: ticket.assignee_id || '',
    });
    setDueDate(ticket.due_date ? new Date(ticket.due_date) : undefined);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      deleteTicketMutation.mutate(ticketId);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTicket) return;

    const ticketData = {
      id: editingTicket.id,
      title: formData.title,
      description: formData.description || null,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      category: formData.category,
      priority: formData.priority as 'Low' | 'Medium' | 'High' | 'Critical',
      status: formData.status as 'New' | 'In Progress' | 'Resolved' | 'Closed',
      assigned_to: formData.assigned_to || null,
      assignee_id: formData.assignee_id || null,
      due_date: dueDate ? dueDate.toISOString() : null,
    };

    console.log('Submitting edit with data:', ticketData);
    updateTicketMutation.mutate(ticketData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userOrg?.active_organization_id) {
      console.error('No organization found');
      toast({
        title: 'Error',
        description: 'No organization found',
        variant: 'destructive',
      });
      return;
    }

    const ticketData = {
      title: formData.title,
      description: formData.description || null,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      category: formData.category,
      priority: formData.priority as 'Low' | 'Medium' | 'High' | 'Critical',
      status: formData.status as 'New' | 'In Progress' | 'Resolved' | 'Closed',
      assigned_to: formData.assigned_to || null,
      assignee_id: formData.assignee_id || null,
      due_date: dueDate ? dueDate.toISOString() : null,
      organization_id: userOrg.active_organization_id,
    };

    console.log('Submitting ticket with data:', ticketData);
    createTicketMutation.mutate(ticketData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssigneeChange = (employeeId: string) => {
    if (employeeId === 'unassigned') {
      setFormData(prev => ({
        ...prev,
        assignee_id: '',
        assigned_to: ''
      }));
    } else {
      const selectedEmployee = availableEmployees.find(emp => emp.id === employeeId);
      setFormData(prev => ({
        ...prev,
        assignee_id: employeeId,
        assigned_to: selectedEmployee?.full_name || ''
      }));
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'New': return 'default';
      case 'In Progress': return 'secondary';
      case 'Resolved': return 'outline';
      case 'Closed': return 'outline';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'default';
    }
  };

  // Stats calculation
  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'New').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
  };

  return (
    <div className="space-y-2">
      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Create a new customer service ticket to track and manage customer inquiries.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ticket ID Field */}
              <div className="space-y-2">
                <Label htmlFor="ticket_id" className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Ticket ID
                </Label>
                <div className="relative">
                  <Input
                    id="ticket_id"
                    value={previewTicketId}
                    readOnly
                    className="bg-gray-50 text-gray-600 font-mono"
                    placeholder="Auto-generated on save"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-gray-400">Auto-generated</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Ticket ID will be automatically generated in format: TICK-000-YYMMDD
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Technical Support">Technical Support</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Feature Request">Feature Request</SelectItem>
                      <SelectItem value="Bug Report">Bug Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={formData.assignee_id || 'unassigned'} onValueChange={handleAssigneeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Ticket Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
              <DialogDescription>
                Update the ticket information and details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              {/* Ticket ID Field - Read Only */}
              <div className="space-y-2">
                <Label htmlFor="edit_ticket_id" className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Ticket ID
                </Label>
                <Input
                  id="edit_ticket_id"
                  value={editingTicket?.ticket_id || ''}
                  readOnly
                  className="bg-gray-50 text-gray-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_title">Title *</Label>
                  <Input
                    id="edit_title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_customer_name">Customer Name *</Label>
                  <Input
                    id="edit_customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_customer_email">Customer Email</Label>
                  <Input
                    id="edit_customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_customer_phone">Customer Phone</Label>
                  <Input
                    id="edit_customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Technical Support">Technical Support</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Feature Request">Feature Request</SelectItem>
                      <SelectItem value="Bug Report">Bug Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_assignee">Assignee</Label>
                  <Select value={formData.assignee_id || 'unassigned'} onValueChange={handleAssigneeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_due_date">Due Date</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTicketMutation.isPending}>
                  {updateTicketMutation.isPending ? 'Updating...' : 'Update Ticket'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        <div className="bg-blue-50 border-blue-200 border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Total Tickets</h3>
            <Ticket className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">All tickets</div>
          </div>
        </div>
        <div className="bg-yellow-50 border-yellow-200 border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">New</h3>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stats.new}</div>
            <div className="text-xs text-gray-600">Pending review</div>
          </div>
        </div>
        <div className="bg-purple-50 border-purple-200 border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">In Progress</h3>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
            <div className="text-xs text-gray-600">Being worked on</div>
          </div>
        </div>
        <div className="bg-green-50 border-green-200 border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Resolved</h3>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{stats.resolved}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-1.5">
              <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Tickets</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Manage and track customer support tickets</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-left">Created</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Ticket ID</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Client</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Title</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Category</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Description</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Assignee</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Follow Up</TableHead>
                  <TableHead className="whitespace-nowrap text-left">FU Priority</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Source</TableHead>
                  <TableHead className="whitespace-nowrap text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      Loading tickets...
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-blue-600 font-medium">
                        {ticket.ticket_id ? ticket.ticket_id.split('-').slice(-1)[0] : 'N/A'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{ticket.customer_name || 'N/A'}</TableCell>
                      <TableCell className="whitespace-nowrap">{ticket.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{ticket.category}</TableCell>
                      <TableCell className="whitespace-nowrap">{ticket.description?.substring(0, 20) || 'N/A'}</TableCell>
                      <TableCell className="whitespace-nowrap">{ticket.assigned_to || 'Unassigned'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">0</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeVariant(ticket.priority) === 'destructive' ? 'bg-red-100 text-red-700' : 
                          getPriorityBadgeVariant(ticket.priority) === 'secondary' ? 'bg-yellow-100 text-yellow-700' : 
                          getPriorityBadgeVariant(ticket.priority) === 'outline' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {ticket.priority}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeVariant(ticket.status) === 'default' ? 'bg-red-100 text-red-700' : 
                          getStatusBadgeVariant(ticket.status) === 'secondary' ? 'bg-yellow-100 text-yellow-700' : 
                          getStatusBadgeVariant(ticket.status) === 'outline' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {ticket.status}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          Email
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white z-50">
                            <DropdownMenuItem 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleEditTicket(ticket)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer hover:bg-gray-100 text-red-600"
                              onClick={() => handleDeleteTicket(ticket.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerServiceDashboard;
