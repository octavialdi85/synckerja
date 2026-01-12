import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { useToast } from '@/features/ui/use-toast';

export interface PurchaseRequestFormData {
  purchaseType?: string;
  requestTitle?: string;
  amountIdr?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  description?: string;
  companyBenefit?: string;
  productivityImpact?: string;
  efficiencyImpact?: string;
  expectedOutcome?: string;
  vendorName?: string;
  purchaseLink?: string;
  accountUsername?: string;
  accountPassword?: string;
}

export interface PurchaseRequest {
  id: string;
  organization_id: string;
  requester_id: string;
  requester_name: string;
  department_name?: string;
  request_type?: string; 
  purchase_type?: string; // Made optional for reimbursement compatibility
  reimbursement_type?: string;
  request_title: string;
  amount_idr: number;
  is_recurring?: boolean;
  recurring_frequency?: string;
  expense_date?: string;
  original_receipt_amount?: string; // Keep as string to match database
  description: string;
  company_benefit: string;
  productivity_impact?: string;
  efficiency_impact?: string;
  expected_outcome?: string;
  vendor_name?: string;
  merchant_name?: string;
  receipt_number?: string;
  purchase_link?: string;
  account_username?: string;
  account_password?: string;
  exchange_rate?: string; // Keep as string to match database
  business_purpose?: string;
  advance_request_id?: string;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  expense_type_id?: string;
  expense_category_id?: string;
  approved_by_user_id?: string;
  rejected_by_user_id?: string;
  approval_notes?: string;
  approved_by_name?: string;
  rejected_by_name?: string;
  paid_at?: string;
  payment_status?: string;
  expense_types?: {
    name: string;
    description?: string;
  } | null;
  expense_categories?: {
    name: string;
    description?: string;
  } | null;
}

export const usePurchaseRequests = () => {
  const { organizationId } = useCurrentOrg();

  return useQuery({
    queryKey: ['purchase-requests', organizationId],
    queryFn: async () => {
      console.log('Fetching purchase requests for organization:', organizationId);
      
      if (!organizationId) {
        console.log('No organization ID found');
        return [];
      }

      try {
        // First, try to fetch with joins
        const { data, error } = await supabase
          .from('purchase_requests')
          .select(`
            *,
            expense_types:expense_type_id(name, description),
            expense_categories:expense_category_id(name, description)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching purchase requests:', error);
          throw error;
        }
        
        console.log('Fetched purchase requests:', data);
        
        return (data || []).map(item => ({
          ...item,
          // Keep original_receipt_amount as string since database expects string
          original_receipt_amount: item.original_receipt_amount || undefined,
          // Keep exchange_rate as string since database expects string
          exchange_rate: item.exchange_rate || '1',
          expense_types: Array.isArray(item.expense_types) ? item.expense_types[0] || null : item.expense_types,
          expense_categories: Array.isArray(item.expense_categories) ? item.expense_categories[0] || null : item.expense_categories
        })) as PurchaseRequest[];
      } catch (error) {
        console.error('Failed to fetch purchase requests:', error);
        throw error;
      }
    },
    enabled: !!organizationId,
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentUserEmployee();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      formData, 
      files, 
      isDraft = false 
    }: { 
      formData: PurchaseRequestFormData; 
      files: File[];
      isDraft?: boolean;
    }) => {
      if (!organizationId || !user) {
        throw new Error('Organization or user not found');
      }

      // Get expense type and category IDs if purchase type is provided
      let expenseTypeId: string | null = null;
      let expenseCategoryId: string | null = null;

      if (formData.purchaseType) {
        const { data: expenseType } = await supabase
          .from('expense_types')
          .select('id')
          .eq('name', formData.purchaseType)
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .maybeSingle();

        if (expenseType) {
          expenseTypeId = expenseType.id;
        }
      }

      const purchaseRequestData = {
        organization_id: organizationId,
        requester_id: user.id,
        requester_name: currentEmployee?.profile_name || user.email || 'Unknown',
        department_name: currentEmployee?.department_name || null,
        request_type: 'purchase', // Explicitly set to purchase
        purchase_type: formData.purchaseType,
        request_title: formData.requestTitle,
        amount_idr: parseFloat(formData.amountIdr || '0'),
        is_recurring: formData.isRecurring,
        recurring_frequency: formData.recurringFrequency || null,
        description: formData.description,
        company_benefit: formData.companyBenefit,
        productivity_impact: formData.productivityImpact || null,
        efficiency_impact: formData.efficiencyImpact || null,
        expected_outcome: formData.expectedOutcome || null,
        vendor_name: formData.vendorName || null,
        purchase_link: formData.purchaseLink || null,
        account_username: formData.accountUsername || null,
        account_password: formData.accountPassword || null,
        status: isDraft ? 'draft' : 'submitted',
        submitted_at: isDraft ? null : new Date().toISOString(),
        created_by: user.id,
        expense_type_id: expenseTypeId,
        expense_category_id: expenseCategoryId,
      };

      const { data: purchaseRequest, error: requestError } = await supabase
        .from('purchase_requests')
        .insert(purchaseRequestData)
        .select()
        .single();

      if (requestError) throw requestError;

      // Upload files if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${organizationId}/${purchaseRequest.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('purchase-documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { error: docError } = await supabase
            .from('purchase_request_documents')
            .insert({
              purchase_request_id: purchaseRequest.id,
              file_name: fileName,
              original_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
            });

          if (docError) throw docError;
        });

        await Promise.all(uploadPromises);
      }

      return purchaseRequest;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      
      if (variables.isDraft) {
        toast({
          title: "Draft Saved",
          description: "Your purchase request has been saved as draft.",
        });
      } else {
        toast({
          title: "Request Submitted",
          description: "Your purchase request has been submitted successfully.",
        });
      }
    },
    onError: (error) => {
      console.error('Purchase request error:', error);
      toast({
        title: "Error",
        description: "Failed to submit purchase request. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePurchaseRequestStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { data: currentEmployee } = useCurrentUserEmployee();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      rejectionReason,
      approvalNotes,
      markAsPaid = false
    }: { 
      id: string; 
      status: PurchaseRequest['status'];
      rejectionReason?: string;
      approvalNotes?: string;
      markAsPaid?: boolean;
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // If marking as paid, add paid_at timestamp
      if (markAsPaid || approvalNotes?.includes('Payment processed') || approvalNotes?.includes('Marked as paid')) {
        updateData.paid_at = new Date().toISOString();
        updateData.payment_status = 'paid';
      }

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by_user_id = user.id;
        updateData.approved_by_name = currentEmployee?.profile_name || user.email || 'Unknown';
        if (approvalNotes) {
          updateData.approval_notes = approvalNotes;
        }
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by_user_id = user.id;
        updateData.rejected_by_name = currentEmployee?.profile_name || user.email || 'Unknown';
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('purchase_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });
};
