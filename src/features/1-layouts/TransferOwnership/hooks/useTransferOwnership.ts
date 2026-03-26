import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/1-login/contexts/AuthContext";
import { toast } from "@/features/1-login/hooks/use-toast";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { useInvalidateUserCache } from "./useInvalidateUserCache";

interface OwnershipTransfer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  created_at: string;
  organization_id: string;
  from_user_name?: string;
  from_user_email?: string;
  organization_name?: string;
  to_user?: {
    full_name: string;
    email: string;
  };
}

interface OrganizationMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

export const useTransferOwnership = (organizationId?: string | null) => {
  const { user } = useAuth();
  const { t } = useAppTranslation();
  const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<OwnershipTransfer[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const { invalidateOwnershipData, forceRefreshAllData } = useInvalidateUserCache();

  const fetchTransfers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching incoming transfers for user:', user.id);
      
      // Get basic transfer data without joins to avoid foreign key errors
      const { data: transfersData, error: transfersError } = await supabase
        .from('ownership_transfers')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (transfersError) {
        console.error('❌ Error fetching transfers:', transfersError);
        return;
      }

      if (!transfersData || transfersData.length === 0) {
        console.log('📭 No pending transfers found');
        setTransfers([]);
        return;
      }

      // Enrich transfers with user and organization data separately
      const enrichedTransfers = await Promise.all(
        transfersData.map(async (transfer) => {
          // Get from user data
          const { data: fromUserData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', transfer.from_user_id)
            .single();

          // Get organization data
          const { data: orgData } = await supabase
            .from('organizations')
            .select('company_name')
            .eq('id', transfer.organization_id)
            .single();

          return {
            ...transfer,
            from_user_name: fromUserData?.full_name || 'Unknown User',
            from_user_email: fromUserData?.email || '',
            organization_name: orgData?.company_name || 'Unknown Organization'
          };
        })
      );

      console.log('✅ Transfers loaded:', enrichedTransfers);
      setTransfers(enrichedTransfers);
    } catch (error) {
      console.error('❌ Error in fetchTransfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTransfers = async () => {
    if (!user || !organizationId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching pending transfers for organization:', organizationId);
      
      // Get transfers sent by the current user
      const { data: transfersData, error: transfersError } = await supabase
        .from('ownership_transfers')
        .select('*')
        .eq('from_user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (transfersError) {
        console.error('❌ Error fetching pending transfers:', transfersError);
        return;
      }

      if (!transfersData || transfersData.length === 0) {
        console.log('📭 No pending transfers found');
        setPendingTransfers([]);
        return;
      }

      // Enrich transfers with user data
      const enrichedTransfers = await Promise.all(
        transfersData.map(async (transfer) => {
          // Get to user data
          const { data: toUserData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', transfer.to_user_id)
            .single();

          return {
            ...transfer,
            to_user: {
              full_name: toUserData?.full_name || 'Unknown User',
              email: toUserData?.email || ''
            }
          };
        })
      );

      console.log('✅ Pending transfers loaded:', enrichedTransfers);
      setPendingTransfers(enrichedTransfers);
    } catch (error) {
      console.error('❌ Error in fetchPendingTransfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationMembers = async () => {
    if (!organizationId) return;
    
    setMembersLoading(true);
    try {
      console.log('🔍 Fetching organization members for:', organizationId);
      
      const { data: membersData, error } = await supabase
        .rpc('get_organization_members', { _organization_id: organizationId });

      if (error) {
        console.error('❌ Error fetching organization members:', error);
        return;
      }

      console.log('✅ Organization members loaded:', membersData);
      setOrganizationMembers(membersData || []);
    } catch (error) {
      console.error('❌ Error in fetchOrganizationMembers:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const initiateTransfer = async (toUserId: string, message?: string) => {
    if (!organizationId) return false;
    
    try {
      const { data, error } = await supabase.rpc('transfer_ownership', {
        _to_user_id: toUserId,
        _message: message || null
      });

      if (error) {
        throw error;
      }

      toast({
        title: t(
          "transferOwnership.toast.success.requestSentTitle",
          "Transfer started",
        ),
        description: t(
          "transferOwnership.toast.success.requestSentDescription",
          "The ownership transfer request has been sent.",
        ),
      });

      // Refresh pending transfers
      await fetchPendingTransfers();
      
      return true;
    } catch (error: any) {
      console.error('Error initiating transfer:', error);
      toast({
        title: t(
          "transferOwnership.toast.error.rpcFailedTitle",
          "Transfer failed",
        ),
        description:
          error.message ||
          t(
            "transferOwnership.toast.error.startFailedDescription",
            "Could not start the ownership transfer.",
          ),
        variant: "destructive",
      });
      return false;
    }
  };

  const initiateEmailTransfer = async (email: string, message?: string) => {
    try {
      // First, find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        toast({
          title: t(
            "transferOwnership.toast.error.userNotFoundTitle",
            "User not found",
          ),
          description: t(
            "transferOwnership.toast.error.userNotFoundDescription",
            "That email is not registered in the system.",
          ),
          variant: "destructive",
        });
        return false;
      }

      return await initiateTransfer(userData.user_id, message);
    } catch (error: any) {
      console.error('Error initiating email transfer:', error);
      toast({
        title: t(
          "transferOwnership.toast.error.rpcFailedTitle",
          "Transfer failed",
        ),
        description: t(
          "transferOwnership.toast.error.startFailedDescription",
          "Could not start the ownership transfer.",
        ),
        variant: "destructive",
      });
      return false;
    }
  };

  const cancelTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('ownership_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId)
        .eq('from_user_id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: t(
          "transferOwnership.toast.success.cancelledTitle",
          "Transfer cancelled",
        ),
        description: t(
          "transferOwnership.toast.success.cancelledDescription",
          "The ownership transfer request has been cancelled.",
        ),
      });

      // Refresh pending transfers
      await fetchPendingTransfers();
      
      return true;
    } catch (error: any) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: t(
          "transferOwnership.toast.error.cancelFailedTitle",
          "Could not cancel",
        ),
        description:
          error.message ||
          t(
            "transferOwnership.toast.error.cancelFailedDescription",
            "Something went wrong while cancelling the transfer.",
          ),
        variant: "destructive",
      });
      return false;
    }
  };

  const acceptTransfer = async (transferId: string) => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_ownership_transfer', {
        _transfer_id: transferId
      });

      if (error) {
        throw error;
      }

      toast({
        title: t(
          "transferOwnership.toast.success.acceptedTitle",
          "Transfer complete",
        ),
        description: t(
          "transferOwnership.toast.success.acceptedDescription",
          "Organization ownership has been transferred to you. The page will reload…",
        ),
      });

      // Enhanced auto-refresh sequence
      console.log("🔄 Starting comprehensive auto-refresh sequence after transfer acceptance...");
      
      // Step 1: Invalidate ownership-related cache
      await invalidateOwnershipData();
      
      // Step 2: Refresh transfers list
      await fetchTransfers();
      
      // Step 3: Small delay to let the backend process the changes
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 4: Force complete refresh of all data
      await forceRefreshAllData();
      
      return true;
    } catch (error: any) {
      console.error('Error accepting transfer:', error);
      toast({
        title: t(
          "transferOwnership.toast.error.rpcFailedTitle",
          "Transfer failed",
        ),
        description:
          error.message ||
          t(
            "transferOwnership.toast.error.acceptFailedDescription",
            "Could not accept the ownership transfer.",
          ),
        variant: "destructive",
      });
      return false;
    } finally {
      setAccepting(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [user?.id]);

  useEffect(() => {
    if (organizationId) {
      fetchPendingTransfers();
      fetchOrganizationMembers();
    }
  }, [organizationId, user?.id]);

  return {
    transfers,
    pendingTransfers,
    organizationMembers,
    loading,
    accepting,
    membersLoading,
    fetchTransfers,
    fetchPendingTransfers,
    initiateTransfer,
    initiateEmailTransfer,
    cancelTransfer,
    acceptTransfer
  };
};


