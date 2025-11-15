import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { logger } from '@/config/logger';

export interface EmployeeStatus {
  id: string;
  employee_id: string;
  organization_id: string;
  status_text: string;
  location: string;
  status_type: 'work' | 'meeting' | 'break' | 'call' | 'wfh';
  created_at: string;
  expires_at: string;
  employees?: {
    full_name: string;
    profile_photo_url?: string | null;
    departments?: {
      name: string;
    } | null;
  } | null;
}

export const useEmployeeStatus = () => {
  const [statuses, setStatuses] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();

  const fetchStatuses = async () => {
    try {
      if (!organizationId) {
        logger.query('⚠️ No organization ID found for employee status');
        setStatuses([]);
        setLoading(false);
        return;
      }

      logger.query('🔍 Fetching employee statuses for organization:', organizationId);

      const { data, error } = await supabase
        .from('employee_status')
        .select(`
          *,
          employees!inner (
            full_name,
            organization_id,
            profile_photo_url,
            departments (
              name
            )
          )
        `)
        .eq('employees.organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employee statuses:', error);
        toast({
          title: "Error",
          description: "Gagal memuat status karyawan",
          variant: "destructive",
        });
        return;
      }

      setStatuses((data as unknown as EmployeeStatus[]) || []);
    } catch (error) {
      console.error('Error fetching employee statuses:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async (statusData: {
    status_text: string;
    location: string;
    status_type: 'work' | 'meeting' | 'break' | 'call' | 'wfh';
  }) => {
    try {
      // Get current user's employee data using organization context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) throw new Error('User not authenticated or no organization');

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (empError || !employee) {
        logger.debug('Employee not found for current user, this is normal for some users');
        toast({
          title: "Info",
          description: "Status karyawan tidak tersedia untuk akun ini",
          variant: "default",
        });
        return false;
      }

      const { error } = await supabase
        .from('employee_status')
        .insert([{
          ...statusData,
          employee_id: employee.id,
          organization_id: employee.organization_id,
        }]);

      if (error) {
        console.error('Error creating status:', error);
        toast({
          title: "Error",
          description: "Gagal membuat status",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Berhasil",
        description: "Status berhasil dibuat",
      });

      // Refresh the statuses
      fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error creating status:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membuat status",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateStatus = async (statusId: string, statusData: {
    status_text: string;
    location: string;
    status_type: 'work' | 'meeting' | 'break' | 'call' | 'wfh';
  }) => {
    try {
      const { error } = await supabase
        .from('employee_status')
        .update(statusData)
        .eq('id', statusId);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: "Error",
          description: "Gagal memperbarui status",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Berhasil",
        description: "Status berhasil diperbarui",
      });

      fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memperbarui status",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteStatus = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('employee_status')
        .delete()
        .eq('id', statusId);

      if (error) {
        console.error('Error deleting status:', error);
        toast({
          title: "Error",
          description: "Gagal menghapus status",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Berhasil",
        description: "Status berhasil dihapus",
      });

      fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error deleting status:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus status",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchStatuses();
    }
  }, [organizationId]);

  return {
    statuses,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
    refetch: fetchStatuses,
  };
};