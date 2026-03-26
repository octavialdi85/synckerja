import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Badge } from "@/features/ui/badge";
import { Button } from "@/features/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

interface DebugInfoProps {
  userRole: string | null;
  activeOrganization: any;
  organizationMembers: any[];
  pendingTransfers: any[];
  loading: boolean;
  membersLoading: boolean;
}

const DebugInfo = ({
  userRole,
  activeOrganization,
  organizationMembers,
  pendingTransfers,
  loading,
  membersLoading
}: DebugInfoProps) => {
  const { t, language } = useAppTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const dateLocale = language === "id" ? "id-ID" : "en-US";

  return (
    <Card className="mt-6 border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-600" />
            {t("transferOwnership.debug.title", "Debug information")}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 text-xs">
          <div>
            <p className="font-medium mb-2">{t("transferOwnership.debug.userInfo", "User info:")}</p>
            <div className="space-y-1">
              <p>{t("transferOwnership.debug.role", "Role:")} <Badge variant="outline">{userRole || "—"}</Badge></p>
              <p>{t("transferOwnership.debug.activeOrg", "Active org:")} {activeOrganization?.company_name || "—"}</p>
              <p>{t("transferOwnership.debug.orgId", "Org ID:")} {activeOrganization?.id || "—"}</p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">{t("transferOwnership.debug.loadingStates", "Loading states:")}</p>
            <div className="space-y-1">
              <p>
                {t("transferOwnership.debug.transferLoading", "Transfer loading:")}{" "}
                <Badge variant={loading ? "destructive" : "default"}>
                  {loading ? t("transferOwnership.debug.yes", "Yes") : t("transferOwnership.debug.no", "No")}
                </Badge>
              </p>
              <p>
                {t("transferOwnership.debug.membersLoading", "Members loading:")}{" "}
                <Badge variant={membersLoading ? "destructive" : "default"}>
                  {membersLoading ? t("transferOwnership.debug.yes", "Yes") : t("transferOwnership.debug.no", "No")}
                </Badge>
              </p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">
              {t("transferOwnership.debug.members", "Organization members ({{count}}):", {
                count: organizationMembers.length,
              })}
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {organizationMembers.map((member, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <p><strong>{member.full_name}</strong> ({member.email})</p>
                  <p>{t("transferOwnership.debug.role", "Role:")} {member.role} | ID: {member.user_id?.substring(0, 8)}...</p>
                </div>
              ))}
              {organizationMembers.length === 0 && (
                <p className="text-gray-500 italic">
                  {t("transferOwnership.debug.noMembersLoaded", "No members loaded")}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">
              {t("transferOwnership.debug.pending", "Pending transfers ({{count}}):", {
                count: pendingTransfers.length,
              })}
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {pendingTransfers.map((transfer, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <p>
                    {t("transferOwnership.debug.to", "To:")}{" "}
                    {transfer.to_user?.full_name} ({transfer.to_user?.email})
                  </p>
                  <p>
                    {t("transferOwnership.debug.created", "Created:")}{" "}
                    {new Date(transfer.created_at).toLocaleDateString(dateLocale)}
                  </p>
                </div>
              ))}
              {pendingTransfers.length === 0 && (
                <p className="text-gray-500 italic">
                  {t("transferOwnership.debug.noPending", "No pending transfers")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DebugInfo;
