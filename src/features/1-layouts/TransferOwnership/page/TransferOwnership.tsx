import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/features/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/features/1-login/hooks/use-toast";
import { useUserData } from "@/features/1-login/hooks/useUserData";
import { useMultiOrganization } from "@/features/1-login/hooks/useMultiOrganization";
import { useTransferOwnership } from "@/features/1-layouts/TransferOwnership/hooks/useTransferOwnership";
import TransferOwnershipForm from "@/features/1-layouts/TransferOwnership/components/TransferOwnershipForm";
import PendingTransfersList from "@/features/1-layouts/TransferOwnership/components/PendingTransfersList";
import AccessDeniedView from "@/features/1-layouts/TransferOwnership/components/AccessDeniedView";
import LoadingView from "@/features/1-layouts/TransferOwnership/components/LoadingView";
import DebugInfo from "@/features/1-layouts/TransferOwnership/components/DebugInfo";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const TransferOwnership = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  // Use the user data and multi-organization hooks
  const { userRole, profile, loading: userDataLoading } = useUserData();
  const { activeOrganization, loading: orgLoading } = useMultiOrganization();
  
  // Use custom hook for transfer ownership functionality
  const {
    pendingTransfers,
    organizationMembers,
    fetchPendingTransfers,
    cancelTransfer,
    initiateTransfer,
    initiateEmailTransfer,
    acceptTransfer,
    loading: transferLoading,
    membersLoading
  } = useTransferOwnership(activeOrganization?.id || null);

  const loading = userDataLoading || orgLoading;

  // Debug logging
  useEffect(() => {
    console.log('TransferOwnership component state:', {
      userRole,
      profile,
      activeOrganization,
      loading,
      userDataLoading,
      orgLoading,
      organizationMembers,
      membersLoading
    });
  }, [userRole, profile, activeOrganization, loading, userDataLoading, orgLoading, organizationMembers, membersLoading]);

  useEffect(() => {
    // Only check access after user data is loaded
    if (!loading && userRole !== 'owner') {
      console.log('Access denied - user role:', userRole);
      toast({
        title: t("transferOwnership.page.accessDeniedToastTitle", "Access denied"),
        description: t(
          "transferOwnership.page.accessDeniedToastDescription",
          "Only the organization owner can transfer ownership.",
        ),
        variant: "destructive",
      });
      navigate("/");
    }
  }, [loading, userRole, navigate]);

  // Show loading while checking user data
  if (loading) {
    return <LoadingView />;
  }

  // Show access denied only after data is loaded and user is not owner
  if (!loading && userRole !== 'owner') {
    return <AccessDeniedView />;
  }

  // Show loading if no active organization
  if (!activeOrganization) {
    return <LoadingView />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("transferOwnership.page.backToDashboard", "Back to dashboard")}
        </Button>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">
            {t("transferOwnership.page.heroTitle", "Transfer ownership — {{company}}", {
              company: activeOrganization.company_name,
            })}
          </h2>
          <p className="text-sm text-blue-600">
            {t(
              "transferOwnership.page.heroSubtitle",
              "You are transferring ownership for this organization.",
            )}
          </p>
        </div>

        <div className="space-y-6">
          <TransferOwnershipForm
            members={organizationMembers}
            onTransferComplete={fetchPendingTransfers}
            initiateTransfer={initiateTransfer}
            initiateEmailTransfer={initiateEmailTransfer}
            loading={transferLoading}
            membersLoading={membersLoading}
          />

          <PendingTransfersList
            transfers={pendingTransfers}
            onCancelTransfer={cancelTransfer}
          />

          <DebugInfo
            userRole={userRole}
            activeOrganization={activeOrganization}
            organizationMembers={organizationMembers}
            pendingTransfers={pendingTransfers}
            loading={transferLoading}
            membersLoading={membersLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferOwnership;
