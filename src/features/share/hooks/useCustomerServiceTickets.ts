import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface CustomerServiceTicket {
  id: string;
  ticket_id: string;
  title: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed' | 'open' | 'in-progress' | 'resolved' | 'closed';
  assigned_to?: string;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export const useCustomerServiceTickets = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['customer-service-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('Fetching customer service tickets for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer service tickets:', error);
        throw error;
      }
      
      console.log('Customer service tickets fetched:', data?.length || 0);
      return (data as CustomerServiceTicket[]) || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createTicket = useMutation({
    mutationFn: async (ticketData: Partial<CustomerServiceTicket>) => {
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .insert(ticketData)
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...ticketData }: Partial<CustomerServiceTicket> & { id: string }) => {
      const { data, error } = await supabase
        .from('customer_service_tickets')
        .update(ticketData)
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_service_tickets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
    },
  });

  return {
    tickets,
    isLoading,
    error,
    createTicket: createTicket.mutate,
    updateTicket: updateTicket.mutate,
    deleteTicket: deleteTicket.mutate,
  };
};

