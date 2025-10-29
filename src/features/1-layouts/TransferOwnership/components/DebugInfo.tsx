
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Badge } from "@/features/ui/badge";
import { Button } from "@/features/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="mt-6 border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-600" />
            Debug Information
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
            <p className="font-medium mb-2">User Info:</p>
            <div className="space-y-1">
              <p>Role: <Badge variant="outline">{userRole || 'None'}</Badge></p>
              <p>Active Org: {activeOrganization?.company_name || 'None'}</p>
              <p>Org ID: {activeOrganization?.id || 'None'}</p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Loading States:</p>
            <div className="space-y-1">
              <p>Transfer Loading: <Badge variant={loading ? "destructive" : "default"}>{loading ? 'Yes' : 'No'}</Badge></p>
              <p>Members Loading: <Badge variant={membersLoading ? "destructive" : "default"}>{membersLoading ? 'Yes' : 'No'}</Badge></p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Organization Members ({organizationMembers.length}):</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {organizationMembers.map((member, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <p><strong>{member.full_name}</strong> ({member.email})</p>
                  <p>Role: {member.role} | ID: {member.user_id?.substring(0, 8)}...</p>
                </div>
              ))}
              {organizationMembers.length === 0 && (
                <p className="text-gray-500 italic">No members loaded</p>
              )}
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Pending Transfers ({pendingTransfers.length}):</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {pendingTransfers.map((transfer, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <p>To: {transfer.to_user?.full_name} ({transfer.to_user?.email})</p>
                  <p>Created: {new Date(transfer.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {pendingTransfers.length === 0 && (
                <p className="text-gray-500 italic">No pending transfers</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DebugInfo;
