
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';

interface MotivationLike {
  id: string;
  motivation_id: string;
  employee_id: string;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
  };
}

interface Motivation {
  id: string;
  content: string;
  author_name: string;
  is_anonymous: boolean;
  published_at: string;
  expires_at: string;
  status: string;
  created_by: string;
  likes?: MotivationLike[];
  likes_count?: number;
}

export const useMotivations = () => {
  const queryClient = useQueryClient();
  const { data: employeeData } = useCurrentUserEmployee();

  const fetchMotivations = async () => {
    if (!employeeData?.organization_id) return [];

    try {
      // First get motivations
      const { data: motivationData, error: motivationError } = await supabase
        .from('motivations')
        .select('*')
        .eq('organization_id', employeeData.organization_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('published_at', { ascending: false });

      if (motivationError) {
        console.error('Error fetching motivations:', motivationError);
        throw motivationError;
      }

      // Get all likes for these motivations
      const motivationIds = motivationData?.map(m => m.id) || [];
      
      if (motivationIds.length === 0) {
        return [];
      }

      const { data: likesData, error: likesError } = await supabase
        .from('motivation_likes')
        .select('id, motivation_id, employee_id, created_at')
        .in('motivation_id', motivationIds);

      if (likesError) {
        console.error('Error fetching likes:', likesError);
      }

      // Get employee data separately
      const employeeIds = [...new Set(likesData?.map(like => like.employee_id) || [])];
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('id', employeeIds);

      // Combine the data
      const motivationsWithLikes = motivationData?.map(motivation => {
        const motivationLikes = likesData?.filter(like => like.motivation_id === motivation.id) || [];
        
        const likesWithEmployees = motivationLikes.map(like => {
          const employee = employeesData?.find(emp => emp.id === like.employee_id);
          return {
            ...like,
            employee: employee ? { id: employee.id, full_name: employee.full_name } : undefined
          };
        });

        return {
          ...motivation,
          likes: likesWithEmployees,
          likes_count: motivationLikes.length
        };
      }) || [];

      return motivationsWithLikes;
    } catch (error) {
      console.error('Error fetching motivations:', error);
      throw error;
    }
  };

  // Use React Query for motivation data
  const { data: motivations = [], isLoading, refetch: refreshMotivations } = useQuery({
    queryKey: ['motivations', employeeData?.organization_id],
    queryFn: fetchMotivations,
    enabled: !!employeeData?.organization_id,
    staleTime: 30000, // 30 seconds
  });

  const saveMotivation = async (content: string, isAnonymous: boolean, authorName?: string) => {
    if (!employeeData?.organization_id) {
      throw new Error('Organization not found');
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Check daily limit (2 motivations per day)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMotivations, error: checkError } = await supabase
        .from('motivations')
        .select('id')
        .eq('created_by', userData.user.id)
        .eq('organization_id', employeeData.organization_id)
        .gte('created_at', today + ' 00:00:00')
        .lt('created_at', today + ' 23:59:59');

      if (checkError) {
        console.error('Error checking daily limit:', checkError);
        throw new Error('Gagal memeriksa batas harian');
      }

      if (todayMotivations && todayMotivations.length >= 2) {
        throw new Error('Anda sudah menulis 2 motivasi hari ini. Batas harian tercapai.');
      }

      const { data, error } = await supabase
        .from('motivations')
        .insert({
          organization_id: employeeData.organization_id,
          content: content.trim(),
          author_name: isAnonymous ? 'Unknown' : (authorName || 'Unknown'),
          is_anonymous: isAnonymous,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving motivation:', error);
        throw error;
      }

      // Invalidate query to trigger real-time refresh
      queryClient.invalidateQueries({ queryKey: ['motivations', employeeData.organization_id] });
      return data;
    } catch (error) {
      console.error('Error saving motivation:', error);
      throw error;
    }
  };




  const deleteMotivation = async (motivationId: string) => {
    try {
      const { error } = await supabase
        .from('motivations')
        .delete()
        .eq('id', motivationId);

      if (error) {
        console.error('Error deleting motivation:', error);
        throw error;
      }

      // Invalidate query to trigger real-time refresh
      queryClient.invalidateQueries({ queryKey: ['motivations', employeeData?.organization_id] });
    } catch (error) {
      console.error('Error deleting motivation:', error);
      throw error;
    }
  };

  const updateMotivation = async (motivationId: string, content: string, isAnonymous: boolean, authorName?: string) => {
    try {
      const { error } = await supabase
        .from('motivations')
        .update({
          content: content.trim(),
          author_name: isAnonymous ? 'Unknown' : (authorName || 'Unknown'),
          is_anonymous: isAnonymous,
        })
        .eq('id', motivationId);

      if (error) {
        console.error('Error updating motivation:', error);
        throw error;
      }

      // Invalidate query to trigger real-time refresh
      queryClient.invalidateQueries({ queryKey: ['motivations', employeeData?.organization_id] });
    } catch (error) {
      console.error('Error updating motivation:', error);
      throw error;
    }
  };

  const toggleLike = async (motivationId: string) => {
    if (!employeeData?.id || !employeeData?.organization_id) {
      throw new Error('Employee data not found');
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Check if user already liked this motivation
      const { data: existingLike } = await supabase
        .from('motivation_likes')
        .select('id')
        .eq('motivation_id', motivationId)
        .eq('employee_id', employeeData.id)
        .single();

      if (existingLike) {
        // Unlike - remove the like
        const { error } = await supabase
          .from('motivation_likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) {
          console.error('Error unliking motivation:', error);
          throw error;
        }
      } else {
        // Like - add new like
        const { error } = await supabase
          .from('motivation_likes')
          .insert({
            motivation_id: motivationId,
            employee_id: employeeData.id,
            organization_id: employeeData.organization_id,
          });

        if (error) {
          console.error('Error liking motivation:', error);
          throw error;
        }
      }

      // Invalidate query to trigger real-time refresh
      queryClient.invalidateQueries({ queryKey: ['motivations', employeeData.organization_id] });
      return !existingLike; // Return true if liked, false if unliked
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  };

  return {
    motivations,
    isLoading,
    saveMotivation,
    deleteMotivation,
    updateMotivation,
    toggleLike,
    refreshMotivations,
  };
};
