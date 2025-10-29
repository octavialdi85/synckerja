
import { useQueryClient } from '@tanstack/react-query';

export const useInvalidateUserCache = () => {
  const queryClient = useQueryClient();

  const invalidateUserCache = async () => {
    console.log('🔄 Starting aggressive cache invalidation...');
    
    // Invalidate all user-related queries
    await queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
    await queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
    await queryClient.invalidateQueries({ queryKey: ['multiOrganization'] });
    await queryClient.invalidateQueries({ queryKey: ['userData'] });
    
    // Remove cached queries to force fresh fetch
    queryClient.removeQueries({ queryKey: ['currentUserRole'] });
    queryClient.removeQueries({ queryKey: ['userOrganizations'] });
    queryClient.removeQueries({ queryKey: ['multiOrganization'] });
    queryClient.removeQueries({ queryKey: ['userData'] });
    
    // Also clear any other potentially related queries
    queryClient.removeQueries({ queryKey: ['transferOwnership'] });
    queryClient.removeQueries({ queryKey: ['organizationMembers'] });
    queryClient.removeQueries({ queryKey: ['pendingTransfers'] });
    
    // Clear organization-specific queries
    queryClient.removeQueries({ queryKey: ['organizations'] });
    queryClient.removeQueries({ queryKey: ['activeOrganization'] });
    
    // Force refetch of all active queries
    await queryClient.refetchQueries({ 
      type: 'active',
      stale: true 
    });
    
    console.log('✅ User cache invalidated - fresh data will be fetched');
  };

  const forceRefreshAllData = async () => {
    console.log('🚀 Force refreshing all user data...');
    
    // Clear all React Query cache
    queryClient.clear();
    
    // Small delay to ensure cache is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Trigger a page reload as fallback
    setTimeout(() => {
      console.log('🔄 Triggering page reload for complete refresh...');
      window.location.reload();
    }, 1000);
  };

  const invalidateOwnershipData = async () => {
    console.log('🔄 Invalidating ownership-related data...');
    
    // Invalidate transfer-specific queries
    await queryClient.invalidateQueries({ queryKey: ['transferOwnership'] });
    await queryClient.invalidateQueries({ queryKey: ['pendingTransfers'] });
    await queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    
    // Invalidate user role and organization data
    await queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
    await queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
    await queryClient.invalidateQueries({ queryKey: ['multiOrganization'] });
    await queryClient.invalidateQueries({ queryKey: ['userData'] });
    
    console.log('✅ Ownership data invalidated');
  };

  return { invalidateUserCache, forceRefreshAllData, invalidateOwnershipData };
};
