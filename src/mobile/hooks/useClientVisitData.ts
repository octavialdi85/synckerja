import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeData } from "./useRealtimeData";

export interface ClientVisit {
  id: string;
  client_id: string;
  employee_id: string;
  organization_id: string;
  visit_date: string;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  start_location?: any;
  end_location?: any;
  visit_purpose: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  start_photo_path?: string;
  end_photo_path?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    company_name: string;
    contact_person?: string;
    contact_phone?: string;
    address?: string;
  };
}

export interface TodayVisitSchedule {
  isVisitDay: boolean;
  hasScheduledVisits: boolean;
  visits: ClientVisit[];
}

export const useClientVisitData = () => {
  const [todayVisits, setTodayVisits] = useState<ClientVisit[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodayVisitSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientVisitData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Get user's active organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) {
        setError("No active organization found");
        return;
      }

      // Get employee data
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .single();

      if (!employee) {
        setError("Employee data not found");
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Get today's client visits with client data for current employee
      const { data: visits, error: visitsError } = await supabase
        .from('client_visits' as any)
        .select(`
          *,
          client:clients(*)
        `)
        .eq('employee_id', employee.id)
        .eq('visit_date', today)
        .order('planned_start_time', { ascending: true });

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
        setError("Failed to fetch visit data");
        return;
      }

      const typedVisits = (visits || []) as any[];
      setTodayVisits(typedVisits);
      setTodaySchedule({
        isVisitDay: typedVisits.length > 0,
        hasScheduledVisits: typedVisits.length > 0,
        visits: typedVisits
      });

    } catch (err) {
      console.error('Error in fetchClientVisitData:', err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime updates
  const { isConnected: realtimeConnected } = useRealtimeData([
    {
      table: 'clients',
      onInsert: () => {
        console.log('📡 New client, refetching visit data...');
        fetchClientVisitData();
      },
      onUpdate: () => {
        console.log('📡 Client updated, refetching visit data...');
        fetchClientVisitData();
      },
      onDelete: () => {
        console.log('📡 Client deleted, refetching visit data...');
        fetchClientVisitData();
      }
    }
  ]);

  useEffect(() => {
    fetchClientVisitData();
  }, []);

  return {
    todayVisits,
    todaySchedule,
    loading,
    error,
    realtimeConnected,
    refetch: fetchClientVisitData
  };
};