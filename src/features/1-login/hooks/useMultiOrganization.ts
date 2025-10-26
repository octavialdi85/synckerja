
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { useAuth } from "@/features/1-login/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const isDev = import.meta.env.DEV;
const shouldLog = isDev && Math.random() < 0.02; // Only log 2% in dev

interface UserOrganization {
  organization_id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'employee' | 'hr';
  is_active: boolean;
  joined_at: string;
}

interface ActiveOrganization {
  id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'employee' | 'hr';
}

export const useMultiOrganization = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !session) {
      setUserOrganizations([]);
      setActiveOrganization(null);
      setLoading(false);
      return;
    }

    // Add small delay to prevent race conditions with other auth hooks
    const timeoutId = setTimeout(() => {
      fetchUserOrganizations();
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [user, session]);

  const fetchUserOrganizations = async () => {
    if (!user) return;

    try {
      if (shouldLog) console.log("Fetching user organizations for:", user.id);

      // Get current active organization from profiles first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get user organizations with their details
      const { data: userOrgData, error: userOrgError } = await supabase
        .from("user_organizations")
        .select(`
          organization_id,
          is_active,
          joined_at,
          organizations!inner(
            company_name
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (userOrgError) {
        console.error("Error fetching user organizations:", userOrgError);
        return;
      }

      // Get user roles for each organization
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("organization_id, role")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        return;
      }

      // Combine organization data with roles
      const organizations = userOrgData?.map(userOrg => {
        const role = rolesData?.find(r => r.organization_id === userOrg.organization_id);
        return {
          organization_id: userOrg.organization_id,
          company_name: userOrg.organizations.company_name,
          role: role?.role || 'employee' as 'owner' | 'admin' | 'employee' | 'hr',
          is_active: userOrg.is_active,
          joined_at: userOrg.joined_at
        };
      }) || [];

      if (shouldLog) console.log("User organizations:", organizations);
      setUserOrganizations(organizations);

      // Set active organization based on database profile or first available
      if (organizations.length > 0) {
        const activeOrgId = profileData?.active_organization_id;
        let selectedOrg = organizations.find(org => org.organization_id === activeOrgId);
        
        // If no active org in profile or org not found, use first org and update database
        if (!selectedOrg) {
          selectedOrg = organizations[0];
          if (shouldLog) console.log("No active organization in profile, setting to:", selectedOrg.company_name);
          
          // Update profiles table with the first organization
          await supabase
            .from('profiles')
            .update({ 
              active_organization_id: selectedOrg.organization_id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
        
        setActiveOrganization({
          id: selectedOrg.organization_id,
          company_name: selectedOrg.company_name,
          role: selectedOrg.role
        });
      }
    } catch (error) {
      console.error("Error fetching user organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    try {
      console.log("Switching to organization:", organizationId);
      
      // Find the organization to switch to
      const selectedOrg = userOrganizations.find(org => org.organization_id === organizationId);
      if (!selectedOrg) {
        toast({
          title: "Error",
          description: "Organisasi tidak ditemukan.",
          variant: "destructive",
        });
        return false;
      }

      // Update the database first
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          active_organization_id: organizationId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating active organization:", updateError);
        toast({
          title: "Error",
          description: "Gagal mengganti organisasi aktif.",
          variant: "destructive",
        });
        return false;
      }

      // Update local state after successful database update
      setActiveOrganization({
        id: selectedOrg.organization_id,
        company_name: selectedOrg.company_name,
        role: selectedOrg.role
      });
      
      // Clear all subscription-related cache for the new organization
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && 
                 (queryKey.includes('subscription') || queryKey.includes('current-org'));
        }
      });
      
      toast({
        title: "Organisasi Berhasil Diganti",
        description: `Sekarang Anda bekerja di ${selectedOrg.company_name}`,
      });

      return true;
    } catch (error) {
      console.error("Error switching organization:", error);
      toast({
        title: "Error", 
        description: "Terjadi kesalahan saat mengganti organisasi.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    userOrganizations,
    activeOrganization,
    loading,
    switchOrganization,
    refetch: fetchUserOrganizations
  };
};
