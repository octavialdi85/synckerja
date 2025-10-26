import { useState } from "react";
import { Button } from "@/features/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/features/ui/dropdown-menu";
import { ChevronDown, Building, Check, Plus, AlertCircle } from "lucide-react";
import { useMultiOrganization } from "@/features/1-login/hooks/useMultiOrganization";
import { useCentralizedUserData } from "@/features/1-login/contexts/CentralizedUserDataContext";
import { useNavigate } from "react-router-dom";
import CreateOrganizationModal from "@/features/1-login/components/CreateOrganization/CreateOrganizationModal";

const OrganizationSwitcher = () => {
  const { userOrganizations, activeOrganization, switchOrganization, loading, refetch } = useMultiOrganization();
  const { hasOrganization } = useCentralizedUserData();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const handleSwitchOrganization = async (organizationId: string) => {
    if (switching || organizationId === activeOrganization?.id) return;
    
    setSwitching(true);
    setSwitchError(null);
    console.log('🔄 Switching to organization:', organizationId);
    
    try {
      const success = await switchOrganization(organizationId);
      
      if (success) {
        console.log('✅ Organization switch successful');
        // Force a page reload to ensure all components get the new organization context
        // This is more reliable than trying to coordinate all hook refreshes
        window.location.reload();
      } else {
        setSwitchError('Gagal mengganti organisasi aktif');
        console.error('❌ Failed to switch organization');
      }
    } catch (error) {
      console.error('❌ Switch organization error:', error);
      setSwitchError('Terjadi kesalahan saat mengganti organisasi');
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateOrganization = () => {
    console.log('🔄 Opening create organization modal');
    setShowCreateModal(true);
  };

  const handleModalSuccess = () => {
    setShowCreateModal(false);
    // Refresh organizations list
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <>
        <Button 
          variant="ghost" 
          onClick={handleCreateOrganization}
          className="flex items-center gap-2"
        >
          <Plus size={14} />
          <span className="text-sm">Buat Organisasi</span>
        </Button>
        
        <CreateOrganizationModal 
          open={showCreateModal}
          onOpenChange={(open) => {
            setShowCreateModal(open);
            if (!open) {
              // Refresh organizations when modal closes
              refetch();
            }
          }}
        />
      </>
    );
  }

  const organizationCount = userOrganizations?.length || 0;

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 max-w-none justify-start px-2 ml-0"
          disabled={switching}
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <Building size={18} className="text-gray-600" />
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium text-left w-full truncate">
              {activeOrganization.company_name}
            </span>
            {organizationCount > 1 && (
              <span className="text-xs text-gray-500 text-left">
                {organizationCount} organisasi
              </span>
            )}
          </div>
          {switching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 left-2">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
          Organisasi Anda ({organizationCount})
        </div>
        
        {switchError && (
          <div className="px-2 py-2 mb-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle size={12} />
              <span>{switchError}</span>
            </div>
          </div>
        )}
        
        {userOrganizations?.map((org) => (
          <DropdownMenuItem 
            key={org.organization_id}
            onClick={() => handleSwitchOrganization(org.organization_id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={switching}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <Building size={14} className="text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium">{org.company_name}</div>
                <div className="text-xs text-gray-500 capitalize">{org.role}</div>
              </div>
            </div>
            {org.organization_id === activeOrganization.id && (
              <Check size={14} className="text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleCreateOrganization}
          className="flex items-center gap-2 cursor-pointer"
          disabled={switching}
        >
          <Plus size={14} className="text-gray-500" />
          <span className="text-sm">Buat Organisasi Baru</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    
    <CreateOrganizationModal 
      open={showCreateModal}
      onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          // Refresh organizations when modal closes
          refetch();
        }
      }}
    />
    </>
  );
};

export default OrganizationSwitcher;






