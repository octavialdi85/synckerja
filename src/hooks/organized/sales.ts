// Sales hooks - Placeholder implementations
// TODO: Implement actual hooks based on Supabase queries

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';

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
        .eq('active_organization_id', organizationId)
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
        active_organization_id: organizationId,
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

// Hook: useVisitScheduling
export const useVisitScheduling = () => {
  const { organizationId } = useCurrentOrg();

  const { data: visits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['visit-scheduling', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('visit_scheduling')
        .select('*')
        .eq('active_organization_id', organizationId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
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

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['client-profile-status', leadId, organizationId],
    queryFn: async () => {
      if (!leadId || !organizationId) return null;

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

  // Calculate status based on profile data
  const status: 'full' | 'partial' | 'empty' = (() => {
    if (!profile) return 'empty';

    const fields = [
      profile.name,
      (profile as any).code,
      profile.gender,
      profile.age,
      profile.occupation,
      profile.location
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

// Hook: useLeads
export const useLeads = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Fetch leads with join to lead_statuses
  const { data: leads = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['leads', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // First, fetch all leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      if (!leadsData || leadsData.length === 0) {
        return [];
      }

      // Fetch all lead statuses for this organization (both active and inactive for complete mapping)
      console.log('🔍 Fetching lead statuses for organization:', organizationId);
      const { data: statusesData, error: statusesError } = await supabase
        .from('lead_statuses')
        .select('id, name, color, is_active')
        .eq('organization_id', organizationId);

      if (statusesError) {
        console.error('❌ Error fetching lead statuses:', statusesError);
      } else {
        console.log('✅ Fetched lead statuses:', statusesData?.length || 0, 'statuses');
        console.log('📋 Status IDs:', statusesData?.map(s => ({ id: s.id, name: s.name })));
      }

      // Create a map of status_id to status object
      const statusMap = new Map();
      if (statusesData) {
        statusesData.forEach(status => {
          statusMap.set(status.id, {
            id: status.id,
            name: status.name,
            color: status.color,
          });
        });
      }

      // Collect all unique status_ids from leads that are not in the map
      const missingStatusIds = [...new Set(
        leadsData
          .map(lead => lead.status_id)
          .filter(statusId => statusId && !statusMap.has(statusId))
      )];

      // Fetch missing statuses directly by ID (in case they're in a different organization or inactive)
      if (missingStatusIds.length > 0) {
        console.log('🔍 Fetching missing statuses:', missingStatusIds);
        const { data: missingStatuses, error: missingError } = await supabase
          .from('lead_statuses')
          .select('id, name, color, is_active')
          .in('id', missingStatusIds);

        if (!missingError && missingStatuses) {
          missingStatuses.forEach(status => {
            statusMap.set(status.id, {
              id: status.id,
              name: status.name,
              color: status.color,
            });
          });
          console.log('✅ Found missing statuses:', missingStatuses.map(s => s.name));
        } else if (missingError) {
          console.warn('⚠️ Error fetching missing statuses:', missingError);
        }
      }

      // Merge leads with their status information
      const leadsWithStatus = leadsData.map(lead => {
        const status = statusMap.get(lead.status_id);
        
        // Log warning if status_id exists but status still not found after fallback fetch
        if (lead.status_id && !status) {
          console.warn(`⚠️ Status not found for lead ${lead.id}:`, {
            lead_id: lead.id,
            status_id: lead.status_id,
            available_status_ids: Array.from(statusMap.keys()),
          });
        }
        
        return {
          ...lead,
          lead_status: status || null,
        };
      });

      return leadsWithStatus;
    },
    enabled: !!organizationId,
  });

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
      const { id, lead_status, ...updateData } = lead;
      
      // Only update valid database columns (exclude joined/computed fields like lead_status)
      const validFields = {
        client: updateData.client,
        title: updateData.title,
        services: updateData.services,
        category: updateData.category,
        assignee: updateData.assignee,
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

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
    },
  });

  // Delete lead mutation - includes deleting related data (Client Profile, Follow Up Updates, Status History)
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
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

