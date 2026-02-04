// Sales hooks - Placeholder implementations
// TODO: Implement actual hooks based on Supabase queries

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

// Types
export interface SalesActivity {
  id: string;
  client_name: string;
  activity_type: string;
  status: string;
  payment_method: string;
  total_amount: number;
  [key: string]: any;
}

export interface SalesActivityItem {
  id: string;
  service_name: string;
  sub_service_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface CreateSalesActivityItemData {
  service_id: string;
  sub_service_id?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

// Hook: useSalesActivities
export const useSalesActivities = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['sales-activities', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('sales_activities')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching sales activities:', error);
        throw error;
      }
      
      // Fetch services and sub_services separately for each activity
      const enrichedActivities = await Promise.all(
        (data || []).map(async (activity) => {
          const [serviceData, subServiceData] = await Promise.all([
            activity.service_id 
              ? supabase.from('services').select('id, name').eq('id', activity.service_id).maybeSingle()
              : Promise.resolve({ data: null }),
            activity.sub_service_id 
              ? supabase.from('sub_services').select('id, name').eq('id', activity.sub_service_id).maybeSingle()
              : Promise.resolve({ data: null })
          ]);
          
          return {
            ...activity,
            services: serviceData.data ? { id: serviceData.data.id, name: serviceData.data.name } : null,
            sub_services: subServiceData.data ? { id: subServiceData.data.id, name: subServiceData.data.name } : null,
          };
        })
      );
      
      console.log('📊 Fetched sales activities:', enrichedActivities?.length || 0, 'activities for org:', organizationId);
      console.log('📊 Sample activity data:', enrichedActivities?.[0] ? {
        id: enrichedActivities[0].id,
        client_name: enrichedActivities[0].client_name,
        service_id: enrichedActivities[0].service_id,
        services: enrichedActivities[0].services,
        sub_service_id: enrichedActivities[0].sub_service_id,
        sub_services: enrichedActivities[0].sub_services
      } : null);
      return enrichedActivities;
    },
    enabled: !!organizationId,
  });

  // Delete sales activity mutation - includes deleting related data (Items, Payment History)
  const deleteSalesActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      console.log('🗑️ Starting deletion process for sales activity:', activityId);

      // Step 1: Delete Sales Activity Items (sales_activity_items)
      const { error: itemsError } = await supabase
        .from('sales_activity_items')
        .delete()
        .eq('sales_activity_id', activityId);

      if (itemsError) {
        console.error('⚠️ Error deleting sales activity items:', itemsError);
        // Continue deletion even if items delete fails
      } else {
        console.log('✅ Sales activity items deleted');
      }

      // Step 2: Delete Payment History (sales_activity_payments)
      const { error: paymentsError } = await supabase
        .from('sales_activity_payments')
        .delete()
        .eq('sales_activity_id', activityId);

      if (paymentsError) {
        console.error('⚠️ Error deleting payment history:', paymentsError);
        // Continue deletion even if payment history delete fails
      } else {
        console.log('✅ Payment history (sales_activity_payments) deleted');
      }

      // Step 2b: Delete Sales Payments (sales_payments) if exists
      const { error: salesPaymentsError } = await supabase
        .from('sales_payments')
        .delete()
        .eq('sales_activity_id', activityId);

      if (salesPaymentsError) {
        console.error('⚠️ Error deleting sales payments:', salesPaymentsError);
        // Continue deletion even if sales payments delete fails
      } else {
        console.log('✅ Sales payments deleted');
      }

      // Step 3: Delete the sales activity itself
      const { error: activityError } = await supabase
        .from('sales_activities')
        .delete()
        .eq('id', activityId);

      if (activityError) {
        console.error('❌ Error deleting sales activity:', activityError);
        throw activityError;
      }

      console.log('✅ Sales activity and all related data deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activities', organizationId] });
    },
  });

  return {
    activities: activities as SalesActivity[],
    loading,
    refetch,
    deleteSalesActivity: deleteSalesActivityMutation.mutateAsync,
  };
};

// Hook: useSalesActivityMasterData
export const useSalesActivityMasterData = () => {
  const { organizationId } = useCurrentOrg();
  
  // Debug: Log organizationId
  useEffect(() => {
    console.log('🔍 useSalesActivityMasterData - organizationId:', organizationId);
  }, [organizationId]);

  const { data: incomeTypes = [], isLoading: incomeTypesLoading } = useQuery({
    queryKey: ['income-types', organizationId],
    queryFn: async () => {
      console.log('💰 Fetching income types for org:', organizationId);
      
      // Try to fetch with organization_id first, then fallback to null (global)
      let query = supabase
        .from('income_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        // If no org, try to get global income types (organization_id IS NULL)
        query = query.is('organization_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching income types:', error);
        throw error;
      }
      
      console.log('💰 Fetched income types:', data?.length || 0, 'types for org:', organizationId || 'null (global)');
      console.log('💰 Income types data:', data);
      
      return data || [];
    },
    enabled: true, // Always enabled, will fetch global if no org
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      console.log('📦 Fetched services:', data?.length || 0, 'services for org:', organizationId);
      console.log('📦 Services data:', data);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch sub-services separately
  const { data: subServices = [] } = useQuery({
    queryKey: ['sub-services', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('sub_services')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching sub-services:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch income categories
  const { data: incomeCategories = [] } = useQuery({
    queryKey: ['income-categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('income_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching income categories:', error);
        throw error;
      }
      console.log('📂 Fetched income categories:', data?.length || 0, 'categories for org:', organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getCategoriesByIncomeType = (incomeTypeId: string) => {
    if (!incomeTypeId) return [];
    return incomeCategories.filter((cat: any) => cat.income_types_id === incomeTypeId);
  };

  const getSubServicesByService = (serviceId: string) => {
    return subServices.filter((s: any) => s.service_id === serviceId);
  };

  // All services are parent services (no parent_service_id field in services table)
  const parentServices = services;

  // Debug logging
  useEffect(() => {
    console.log('🔍 useSalesActivityMasterData - Master data state:', {
      organizationId,
      incomeTypesCount: incomeTypes.length,
      incomeCategoriesCount: incomeCategories.length,
      servicesCount: services.length,
      parentServicesCount: parentServices.length,
      subServicesCount: subServices.length
    });
  }, [organizationId, incomeTypes, incomeCategories, services, parentServices, subServices]);

  return {
    incomeTypes,
    incomeTypesLoading,
    incomeCategories,
    getCategoriesByIncomeType,
    services,
    parentServices,
    subServices,
    getSubServicesByService,
  };
};

// Hook: useSalesActivityItems
export const useSalesActivityItems = (salesActivityId?: string) => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['sales-activity-items', salesActivityId],
    queryFn: async () => {
      if (!salesActivityId) return [];
      
      const { data, error } = await supabase
        .from('sales_activity_items')
        .select('*')
        .eq('sales_activity_id', salesActivityId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    },
    enabled: !!salesActivityId,
  });

  const createItem = useMutation({
    mutationFn: async (itemData: CreateSalesActivityItemData) => {
      if (!salesActivityId) throw new Error('Sales activity ID is required');
      
      const { data, error } = await supabase
        .from('sales_activity_items')
        .insert({
          ...itemData,
          sales_activity_id: salesActivityId,
          total_price: itemData.quantity * itemData.unit_price,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activity-items', salesActivityId] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...itemData }: Partial<CreateSalesActivityItemData> & { id: string }) => {
      const { data, error } = await supabase
        .from('sales_activity_items')
        .update({
          ...itemData,
          total_price: itemData.quantity && itemData.unit_price 
            ? itemData.quantity * itemData.unit_price 
            : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activity-items', salesActivityId] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('sales_activity_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activity-items', salesActivityId] });
    },
  });

  const getTotalAmount = () => {
    return items.reduce((sum: number, item: SalesActivityItem) => sum + item.total_price, 0);
  };

  return {
    items: items as SalesActivityItem[],
    loading,
    createItem: createItem.mutateAsync,
    updateItem: updateItem.mutateAsync,
    deleteItem: deleteItem.mutateAsync,
    getTotalAmount,
  };
};

// Hook: useSalesActivityPayments
export const useSalesActivityPayments = () => {
  const queryClient = useQueryClient();

  const getPaymentHistory = async (salesActivityId: string, organizationId?: string) => {
    console.log('🔍 Fetching payment history for salesActivityId:', salesActivityId, 'orgId:', organizationId);
    
    // Don't filter by organization_id - payments belong to sales_activity, not directly to org
    // The sales_activity itself has organization_id, so we don't need to filter payments by it
    const { data, error } = await supabase
      .from('sales_activity_payments')
      .select('*')
      .eq('sales_activity_id', salesActivityId)
      .order('payment_date', { ascending: false })
      .order('payment_sequence', { ascending: true }); // Also sort by sequence for consistency

    if (error) {
      console.error('❌ Error fetching payment history:', error);
      throw error;
    }
    
    console.log('💰 Payment history fetched:', data?.length || 0, 'payments');
    console.log('💰 Payment history data:', data);
    
    return data || [];
  };

  const createPaymentHistory = async (paymentData: any) => {
    const { data, error } = await supabase
      .from('sales_activity_payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['sales-activity-payments'] });
    return data;
  };

  const handleDownPayment = async (salesActivityId: string, paymentData: any) => {
    return createPaymentHistory({
      ...paymentData,
      sales_activity_id: salesActivityId,
      payment_type: 'down_payment',
    });
  };

  const handleFinalPayment = async (salesActivityId: string, paymentData: any) => {
    return createPaymentHistory({
      ...paymentData,
      sales_activity_id: salesActivityId,
      payment_type: 'final_payment',
    });
  };

  return {
    getPaymentHistory,
    createPaymentHistory,
    handleDownPayment,
    handleFinalPayment,
  };
};

// Hook: useOfficeLocations (for visit scheduling)
export const useOfficeLocations = () => {
  const { organizationId } = useCurrentOrg();

  const { data: locations = [] } = useQuery({
    queryKey: ['office-locations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('office_locations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addLocation = async (locationData: any) => {
    const { data, error } = await supabase
      .from('office_locations')
      .insert({
        ...locationData,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    locations,
    addLocation,
  };
};

// Hook: useClients
export const useClients = () => {
  const { organizationId } = useCurrentOrg();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active_organization_id', organizationId)
        .order('company_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    clients,
  };
};

// Hook: useLocationTypes
export const useLocationTypes = () => {
  const { organizationId } = useCurrentOrg();

  const { data: locationTypes = [] } = useQuery({
    queryKey: ['location-types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('location_types')
        .select('*')
        .eq('active_organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    locationTypes,
  };
};

// Hook: useVisitScheduling (uses client_visits with joined client, employee, location)
export const useVisitScheduling = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const { data: rawVisits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['visit-scheduling', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('client_visits')
        .select(`
          *,
          clients ( id, company_name, contact_person, contact_phone, address ),
          employees ( id, full_name, email ),
          office_locations ( id, name, address )
        `)
        .eq('organization_id', organizationId)
        .order('visit_date', { ascending: false })
        .order('planned_start_time', { ascending: false });

      if (error) throw error;

      const visits = (data || []).map((row: any) => ({
        ...row,
        clientInfo: row.clients ?? null,
        locationInfo: row.office_locations ?? null,
        employees: row.employees ?? null,
      }));

      return visits;
    },
    enabled: !!organizationId,
  });

  const createScheduledVisit = async (visitData: any) => {
    if (!organizationId) throw new Error('Organization ID is required');

    const { data, error } = await supabase
      .from('client_visits')
      .insert({
        organization_id: organizationId,
        lead_client_id: visitData.client_id ?? visitData.lead_client_id,
        employee_id: visitData.employee_id ?? visitData.sales_person_id,
        validated_location_id: visitData.location_id ?? visitData.validated_location_id ?? null,
        visit_date: visitData.visit_date ?? visitData.scheduled_date,
        visit_purpose: visitData.visit_purpose ?? visitData.purpose ?? '',
        status: visitData.status ?? 'scheduled',
        planned_start_time: visitData.planned_start_time ?? visitData.plannedStartTime ?? null,
        planned_end_time: visitData.planned_end_time ?? visitData.plannedEndTime ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['visit-scheduling', organizationId] });
    return data;
  };

  return {
    visits: rawVisits,
    loading,
    refetch,
    createScheduledVisit,
  };
};

// Hook: useClientVisits
export const useClientVisits = () => {
  const { organizationId } = useCurrentOrg();

  const { data: visits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['client-visits', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('client_visits')
        .select('*')
        .eq('organization_id', organizationId)
        .order('visit_date', { ascending: false })
        .order('planned_start_time', { ascending: false });

      if (error) {
        console.error('❌ Error fetching client visits:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    visits,
    loading,
    refetch,
  };
};

// Hook: useClientVisitsMetrics
export const useClientVisitsMetrics = () => {
  const { organizationId } = useCurrentOrg();

  const { data: visits = [], isLoading: loading } = useQuery({
    queryKey: ['client-visits-metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('client_visits')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error fetching client visits metrics:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!organizationId,
  });

  const metrics = {
    total: visits.length,
    scheduled: visits.filter((v: any) => v.status === 'scheduled').length,
    completed: visits.filter((v: any) => v.status === 'completed').length,
    cancelled: visits.filter((v: any) => v.status === 'cancelled').length,
  };

  return {
    metrics,
    loading,
  };
};

// Hook: useIncomeTransactions
export const useIncomeTransactions = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const createIncomeTransaction = useMutation({
    mutationFn: async (transactionData: any) => {
      if (!organizationId) throw new Error('Organization ID is required');
      
      const { data, error } = await supabase
        .from('income_transactions')
        .insert({
          ...transactionData,
          active_organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['income-transactions', organizationId] });
      return data;
    },
  });

  return {
    createIncomeTransaction: createIncomeTransaction.mutateAsync,
  };
};

// Types for Lead Status History
export interface LeadStatusHistoryEntry {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  notes: string | null;
  organization_id: string;
  created_at: string;
}

// Hook: useLeadStatusHistory
export const useLeadStatusHistory = () => {
  const { organizationId } = useCurrentOrg();

  const getStatusHistory = async (leadId: string): Promise<LeadStatusHistoryEntry[]> => {
    if (!organizationId) {
      console.error('Organization ID is required');
      return [];
    }

    if (!leadId) {
      console.error('Lead ID is required');
      return [];
    }

    try {
      // WhatsApp conversation: fetch from whatsapp_conversation_status_history
      if (String(leadId).startsWith('wa-')) {
        const conversationId = String(leadId).replace(/^wa-/, '');
        const { data, error } = await supabase
          .from('whatsapp_conversation_status_history')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('organization_id', organizationId)
          .order('changed_at', { ascending: false });

        if (error) {
          console.error('Error fetching WhatsApp conversation status history:', error);
          throw error;
        }

        const rows = (data || []) as Array<{
          id: string;
          conversation_id: string;
          old_status: string | null;
          new_status: string;
          changed_at: string;
          changed_by: string | null;
          changed_by_name: string | null;
          notes: string | null;
          organization_id: string;
          created_at: string;
        }>;
        return rows.map((row) => ({
          id: row.id,
          lead_id: leadId,
          old_status: row.old_status,
          new_status: row.new_status,
          changed_at: row.changed_at,
          changed_by: row.changed_by,
          changed_by_name: row.changed_by_name,
          notes: row.notes,
          organization_id: row.organization_id,
          created_at: row.created_at,
        }));
      }

      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', leadId)
        .eq('organization_id', organizationId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching lead status history:', error);
        throw error;
      }

      return (data || []) as LeadStatusHistoryEntry[];
    } catch (error) {
      console.error('Error in getStatusHistory:', error);
      return [];
    }
  };

  return {
    getStatusHistory,
    loading: false, // Manual fetching doesn't need loading state from useQuery
  };
};

// Hook: useClientProfileStatus
export const useClientProfileStatus = (leadId: string) => {
  const { organizationId } = useCurrentOrg();
  const isWhatsApp = leadId.startsWith('wa-');
  const conversationId = isWhatsApp ? leadId.replace(/^wa-/, '') : null;

  const isEmail = leadId.startsWith('email-');

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['client-profile-status', leadId, organizationId],
    queryFn: async () => {
      if (!leadId || !organizationId) return null;

      // Email leads: no client profile table yet; treat as empty (lead_id is synthetic, not UUID)
      if (isEmail) return null;

      if (isWhatsApp && conversationId) {
        const { data, error } = await supabase
          .from('whatsapp_conversation_client_profiles')
          .select('*')
          .eq('conversation_id', conversationId)
          .maybeSingle();
        if (error) {
          console.error('Error fetching WhatsApp client profile:', error);
          return null;
        }
        return data;
      }

      // Only real lead UUIDs go to lead_client_profiles
      const { data, error } = await supabase
        .from('lead_client_profiles')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching client profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!leadId && !!organizationId,
  });

  // Calculate status based on profile data (termasuk phone_number dan email)
  const status: 'full' | 'partial' | 'empty' = (() => {
    if (!profile) return 'empty';

    const fields = [
      profile.name,
      (profile as any).code,
      profile.gender,
      profile.age,
      profile.occupation,
      profile.location,
      (profile as any).phone_number,
      (profile as any).email
    ];
    
    const filledFields = fields.filter(
      field => field !== null && field !== undefined && field !== ''
    ).length;

    if (filledFields === 0) {
      return 'empty';
    } else if (filledFields === fields.length) {
      return 'full';
    } else {
      return 'partial';
    }
  })();

  return {
    status,
    loading,
    profile,
  };
};

// Scope: 'mine' = only leads/chats assigned to current agent; 'unassigned' = only not assigned; 'all' = no filter
export type LeadsScope = 'all' | 'mine' | 'unassigned';

function filterLeadsByScope(
  list: Array<{ assignee_id?: string | null; id?: string }>,
  scope: LeadsScope,
  currentEmployeeId: string | null
): typeof list {
  if (scope === 'all') return list;
  if (scope === 'mine') {
    if (!currentEmployeeId) return [];
    return list.filter((item) => (item.assignee_id ?? null) === currentEmployeeId);
  }
  // unassigned
  return list.filter((item) => (item.assignee_id ?? null) == null);
}

// Hook: useLeads
export const useLeads = (options?: { scope?: LeadsScope }) => {
  const scope = options?.scope ?? 'mine';
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentUserEmployee();
  const currentEmployeeId = currentEmployee?.id ?? null;
  const { isOwner } = useCentralizedUserData();
  // Owner always sees all leads regardless of scope
  const effectiveScope: LeadsScope = isOwner ? 'all' : scope;

  // Realtime: invalidate leads query when leads atau whatsapp_conversations berubah (status/assignee dll) — sama seperti tab live chat
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!organizationId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = supabase
      .channel('leads_management_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'email_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  // Fetch leads with join to lead_statuses; filter by scope (assignee_id)
  const { data: rawLeadsList = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['leads', organizationId, effectiveScope, currentEmployeeId, isOwner],
    queryFn: async () => {
      if (!organizationId) return [];

      // 1) Fetch all leads from "leads" table
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      const rawLeads = leadsData ?? [];

      // Fetch all lead statuses for this organization (for both leads and WhatsApp conversations)
      let statusMap = new Map<string, { id: string; name: string; color: string }>();
      const { data: statusesData, error: statusesError } = await supabase
        .from('lead_statuses')
        .select('id, name, color, is_active')
        .eq('organization_id', organizationId);

      const normId = (id: string | null | undefined) => (id == null ? '' : String(id));
      if (!statusesError && statusesData) {
        statusesData.forEach((status: any) => {
          const id = normId(status.id);
          statusMap.set(id, { id: status.id, name: status.name, color: status.color });
        });
      }
      const missingStatusIds = [...new Set(
        rawLeads
          .map((lead: any) => lead.status_id)
          .filter((statusId: string) => statusId && !statusMap.has(normId(statusId)))
      )];
      if (missingStatusIds.length > 0) {
        const { data: missingStatuses, error: missingError } = await supabase
          .from('lead_statuses')
          .select('id, name, color, is_active')
          .in('id', missingStatusIds);
        if (!missingError && missingStatuses) {
          missingStatuses.forEach((status: any) => {
            const id = normId(status.id);
            statusMap.set(id, { id: status.id, name: status.name, color: status.color });
          });
        }
      }

      // Merge leads with their status information
      let leadsWithStatus = rawLeads.map((lead: any) => {
        const status = statusMap.get(normId(lead.status_id));
        return {
          ...lead,
          lead_status: status || null,
        };
      });

      // 2) Fetch leads from whatsapp_conversations (same org; includes channel: whatsapp | instagram) and map to lead-like rows
      const { data: whatsappConvs, error: whatsappError } = await supabase
        .from('whatsapp_conversations')
        .select('id, organization_id, customer_wa_id, customer_name, channel, last_message_at, last_message_body, last_opened_at, lead_status_id, followup, fu_priority, assignee_id, created_at, updated_at, ticket_id')
        .eq('organization_id', organizationId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      // Resolve assignee_id → assignee name for ALL leads (regular + WhatsApp) so Consultant Performance section has data
      const assigneeIdsFromLeads = [...new Set(rawLeads.map((l: any) => l.assignee_id).filter(Boolean))] as string[];
      const assigneeIdsFromWa = (whatsappConvs ?? []).map((c: any) => c.assignee_id).filter(Boolean) as string[];
      const allAssigneeIds = [...new Set([...assigneeIdsFromLeads, ...assigneeIdsFromWa])];
      const assigneeNameMap = new Map<string, string>();
      if (allAssigneeIds.length > 0) {
        const { data: assigneeRows } = await supabase
          .from('employees')
          .select('id, full_name, email')
          .in('id', allAssigneeIds);
        (assigneeRows ?? []).forEach((e: any) => {
          assigneeNameMap.set(normId(e.id), e.full_name || e.email || '');
        });
      }
      leadsWithStatus = leadsWithStatus.map((lead: any) => ({
        ...lead,
        assignee: (lead.assignee && String(lead.assignee).trim()) ? lead.assignee : (lead.assignee_id ? assigneeNameMap.get(normId(lead.assignee_id)) ?? null : null),
      }));

      const defaultStatusId = statusesData?.[0]?.id ?? '';

      if (!whatsappError && whatsappConvs && whatsappConvs.length > 0) {
        // Ensure statusMap has all statuses used by WhatsApp (for Report Summary "Converted" count)
        const waStatusIds = [...new Set(whatsappConvs.map((c: any) => c.lead_status_id).filter(Boolean))].filter((id: string) => !statusMap.has(normId(id)));
        if (waStatusIds.length > 0) {
          const { data: waStatuses, error: waErr } = await supabase
            .from('lead_statuses')
            .select('id, name, color, is_active')
            .in('id', waStatusIds);
          if (!waErr && waStatuses) {
            waStatuses.forEach((status: any) => {
              const id = normId(status.id);
              statusMap.set(id, { id: status.id, name: status.name, color: status.color });
            });
          }
        }
        const whatsappAsLeads = whatsappConvs.map((c: any) => {
          const statusId = c.lead_status_id ?? '';
          const leadStatus = statusId ? statusMap.get(normId(statusId)) ?? null : null;
          const isInstagram = (c.channel ?? '').toLowerCase() === 'instagram';
          const sourceLabel = isInstagram ? 'Instagram' : 'WhatsApp';
          const waTicketId = c.ticket_id ?? ((isInstagram ? 'IG-' : 'WA-') + String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase());
          const assigneeId = c.assignee_id ?? null;
          const assigneeName = assigneeId ? assigneeNameMap.get(normId(assigneeId)) ?? null : null;
          return {
            id: 'wa-' + c.id,
            client: c.customer_name || c.customer_wa_id || sourceLabel,
            title: (c.last_message_body || sourceLabel).slice(0, 100),
            services: null,
            category: '-',
            assignee: assigneeName as string | null,
            assignee_id: assigneeId,
            fu_priority: c.fu_priority ?? null,
            status_id: statusId,
            source: sourceLabel,
            followup: c.followup ?? 0,
            converted_at: null,
            created_at: c.created_at,
            updated_at: c.updated_at,
            created_by: '',
            created_by_name: '',
            organization_id: c.organization_id,
            ticket_id: waTicketId,
            lead_status: leadStatus,
            _fromWhatsApp: true as const,
            _chatOpenedAt: c.last_opened_at ?? null,
            _customerWaId: (c.customer_wa_id ?? '') as string,
          };
        });
        leadsWithStatus = [...leadsWithStatus, ...whatsappAsLeads];
      }

      // 3) Fetch email conversations (same org) and map to lead-like rows with source: Email
      const { data: emailConvs, error: emailError } = await supabase.rpc('get_email_conversations_with_preview', {
        p_organization_id: organizationId,
      });
      if (!emailError && emailConvs && emailConvs.length > 0) {
        const emailAsLeads = (emailConvs as any[]).map((c: any) => {
          const statusId = c.lead_status_id ?? defaultStatusId;
          const leadStatus = statusId ? statusMap.get(normId(statusId)) ?? null : null;
          const ticketId = 'EMAIL-' + String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase();
          const lastBody = (c.last_message_body ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
          return {
            id: 'email-' + c.id,
            client: c.from_email || c.email_connection_display || 'Email',
            title: lastBody || 'Email',
            services: null,
            category: '-',
            assignee: null as string | null,
            assignee_id: null as string | null,
            fu_priority: c.fu_priority ?? null,
            status_id: statusId,
            source: 'Email',
            followup: c.followup ?? 0,
            converted_at: null,
            created_at: c.created_at ?? c.last_message_at,
            updated_at: c.updated_at ?? c.created_at,
            created_by: '',
            created_by_name: '',
            organization_id: c.organization_id,
            ticket_id: ticketId,
            lead_status: leadStatus,
            _fromEmail: true as const,
          };
        });
        leadsWithStatus = [...leadsWithStatus, ...emailAsLeads];
      }

      return filterLeadsByScope(leadsWithStatus, effectiveScope, currentEmployeeId);
    },
    enabled: !!organizationId && (effectiveScope === 'all' || !!currentEmployeeId || effectiveScope === 'unassigned'),
    refetchInterval: 10000, // Fallback refresh setiap 10s (sama seperti tab live chat)
  });

  const leads = rawLeadsList;

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      const userName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown';

      const { data, error } = await supabase
        .from('leads')
        .insert({
          client: leadData.client,
          title: leadData.title,
          services: leadData.services || null,
          category: leadData.category || null,
          assignee: leadData.assignee,
          assignee_id: (leadData as { assignee_id?: string | null }).assignee_id ?? null,
          fu_priority: leadData.fu_priority || null,
          status_id: leadData.status_id,
          source: leadData.source || null,
          organization_id: organizationId,
          created_by: userId || '',
          created_by_name: userName,
          followup: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async (lead: any) => {
      // Email conversation: update email_conversations.lead_status_id (same as WhatsApp)
      if (lead?.id && String(lead.id).startsWith('email-')) {
        const convId = String(lead.id).replace(/^email-/, '');
        const { error: updateError } = await supabase
          .from('email_conversations')
          .update({
            lead_status_id: lead.status_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', convId);
        if (updateError) {
          console.error('Error updating email conversation status:', updateError);
          throw updateError;
        }
        return lead;
      }
      // WhatsApp conversation: update lead_status_id and record status history
      if (lead?.id && String(lead.id).startsWith('wa-')) {
        const convId = String(lead.id).replace(/^wa-/, '');
        const oldStatusName = lead.lead_status?.name ?? null;

        const { error: updateError } = await supabase
          .from('whatsapp_conversations')
          .update({
            lead_status_id: lead.status_id || null,
            assignee_id: lead.assignee_id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', convId);
        if (updateError) {
          console.error('Error updating WhatsApp conversation status:', updateError);
          throw updateError;
        }

        // Resolve new status name and insert into whatsapp_conversation_status_history
        let newStatusName = '';
        if (lead.status_id) {
          const { data: statusRow } = await supabase
            .from('lead_statuses')
            .select('name')
            .eq('id', lead.status_id)
            .maybeSingle();
          newStatusName = (statusRow?.name as string) ?? '';
        }
        if (oldStatusName !== null || newStatusName !== '') {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id ?? null;
          const userName = userData?.user?.user_metadata?.full_name || userData?.user?.email || null;
          await supabase.from('whatsapp_conversation_status_history').insert({
            conversation_id: convId,
            old_status: oldStatusName,
            new_status: newStatusName || 'Open',
            changed_at: new Date().toISOString(),
            changed_by: userId,
            changed_by_name: userName,
            organization_id: lead.organization_id,
          });
        }
        if (newStatusName?.trim().toLowerCase() === 'closed') {
          const now = new Date().toISOString();
          await supabase
            .from('whatsapp_conversation_cycles')
            .update({ resolved_at: now, updated_at: now })
            .eq('conversation_id', convId)
            .is('resolved_at', null);
        }
        return lead;
      }
      const { id, lead_status, organization_id: leadOrgId, ...updateData } = lead;
      const organizationIdForHistory = leadOrgId ?? organizationId;

      // Ambil status lama dari DB untuk catat ke lead_status_history
      let oldStatusId: string | null = null;
      if (updateData.status_id !== undefined) {
        const { data: currentLead } = await supabase
          .from('leads')
          .select('status_id')
          .eq('id', id)
          .maybeSingle();
        oldStatusId = currentLead?.status_id ?? null;
      }

      // Only update valid database columns (exclude joined/computed fields like lead_status)
      const validFields: Record<string, unknown> = {
        client: updateData.client,
        title: updateData.title,
        services: updateData.services,
        category: updateData.category,
        assignee: updateData.assignee,
        assignee_id: updateData.assignee_id ?? null,
        fu_priority: updateData.fu_priority,
        status_id: updateData.status_id,
        source: updateData.source,
        followup: updateData.followup,
        converted_at: updateData.converted_at,
        ticket_id: updateData.ticket_id,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined/null fields to avoid overwriting with null
      Object.keys(validFields).forEach(key => {
        if (validFields[key as keyof typeof validFields] === undefined) {
          delete validFields[key as keyof typeof validFields];
        }
      });

      const { data, error } = await supabase
        .from('leads')
        .update(validFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating lead:', error);
        throw error;
      }

      // Catat perubahan status ke lead_status_history (agar Status History modal berisi data)
      const newStatusId = validFields.status_id as string | undefined;
      if (newStatusId !== undefined && String(newStatusId) !== String(oldStatusId)) {
        let oldStatusName: string | null = null;
        let newStatusName: string = '';
        if (oldStatusId) {
          const { data: oldRow } = await supabase
            .from('lead_statuses')
            .select('name')
            .eq('id', oldStatusId)
            .maybeSingle();
          oldStatusName = (oldRow?.name as string) ?? null;
        }
        const { data: newRow } = await supabase
          .from('lead_statuses')
          .select('name')
          .eq('id', newStatusId)
          .maybeSingle();
        newStatusName = (newRow?.name as string) ?? '';

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        const userName = (userData?.user?.user_metadata?.full_name as string) || (userData?.user?.email as string) || null;
        const orgId = organizationIdForHistory ?? organizationId;
        if (orgId) {
          await supabase.from('lead_status_history').insert({
            lead_id: id,
            old_status: oldStatusName,
            new_status: newStatusName || 'Open',
            changed_at: new Date().toISOString(),
            changed_by: userId,
            changed_by_name: userName,
            organization_id: orgId,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
    },
  });

  // Delete lead mutation - includes deleting related data (Client Profile, Follow Up Updates, Status History)
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      if (leadId.startsWith('wa-')) return;
      console.log('🗑️ Starting deletion process for lead:', leadId);

      // Step 1: Delete Client Profile (lead_client_profiles)
      const { error: clientProfileError } = await supabase
        .from('lead_client_profiles')
        .delete()
        .eq('lead_id', leadId);

      if (clientProfileError) {
        console.error('⚠️ Error deleting client profile:', clientProfileError);
        // Continue deletion even if client profile delete fails
      } else {
        console.log('✅ Client profile deleted');
      }

      // Step 2: Delete Follow Up Updates (lead_follow_up_updates)
      const { error: followUpError } = await supabase
        .from('lead_follow_up_updates')
        .delete()
        .eq('lead_id', leadId);

      if (followUpError) {
        console.error('⚠️ Error deleting follow up updates:', followUpError);
        // Continue deletion even if follow up updates delete fails
      } else {
        console.log('✅ Follow up updates deleted');
      }

      // Step 3: Delete Status History (lead_status_history)
      const { error: statusHistoryError } = await supabase
        .from('lead_status_history')
        .delete()
        .eq('lead_id', leadId);

      if (statusHistoryError) {
        console.error('⚠️ Error deleting status history:', statusHistoryError);
        // Continue deletion even if status history delete fails
      } else {
        console.log('✅ Status history deleted');
      }

      // Step 4: Delete the lead itself
      const { error: leadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (leadError) {
        console.error('❌ Error deleting lead:', leadError);
        throw leadError;
      }

      console.log('✅ Lead and all related data deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
    },
  });

  return {
    leads: leads as any[],
    loading,
    refetch,
    createLead: createLeadMutation.mutateAsync,
    updateLead: updateLeadMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
  };
};

