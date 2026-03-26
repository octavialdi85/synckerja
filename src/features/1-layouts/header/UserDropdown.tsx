import React, { memo, useMemo, useCallback } from "react";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/features/ui/dropdown-menu";
import { LogOut, Settings, User, Crown, Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/features/1-login/hooks/use-toast";
import { UnifiedAvatar } from "@/features/share/UnifiedAvatar";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const isDev = import.meta.env.DEV;
const shouldLog = isDev && Math.random() < 0.05; // Only log 5% in dev

interface Profile {
  full_name: string;
  email: string;
  active_organization_id?: string | null;
}
type UserRole = 'owner' | 'admin' | 'employee' | null;
interface UserDropdownProps {
  profile: Profile | null;
  userRole: UserRole;
}
const UserDropdown = memo<UserDropdownProps>(({
  profile,
  userRole
}) => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout berhasil",
        description: "Anda telah berhasil keluar dari aplikasi."
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat logout.",
        variant: "destructive"
      });
    }
  }, [navigate]);
  
  const handleTransferOwnership = useCallback(() => {
    if (shouldLog) console.log("Navigating to transfer ownership page");
    navigate("/transfer-ownership");
  }, [navigate]);
  
  const handleSettings = useCallback(() => {
    if (shouldLog) console.log("Navigating to settings page");
    navigate("/settings");
  }, [navigate]);
  
  const roleConfig = useMemo(() => {
    switch (userRole) {
      case 'owner':
        return {
          icon: <Crown className="h-4 w-4 text-yellow-600" />,
          label: 'Owner'
        };
      case 'admin':
        return {
          icon: <Shield className="h-4 w-4 text-blue-600" />,
          label: 'Admin'
        };
      case 'employee':
        return {
          icon: <Users className="h-4 w-4 text-green-600" />,
          label: 'Employee'
        };
      default:
        return {
          icon: <User className="h-4 w-4 text-gray-500" />,
          label: 'User'
        };
    }
  }, [userRole]);
  
  const shouldShowTransferOwnership = useMemo(() => userRole === 'owner', [userRole]);
  const displayName = useMemo(() => profile?.full_name || "User", [profile?.full_name]);
  
  return <DropdownMenuContent className="w-72 p-0" align="end" forceMount>
      <DropdownMenuLabel className="p-4 pb-2">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center gap-3">
            <UnifiedAvatar name={displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
            {roleConfig.icon}
            <span className="text-xs font-medium text-gray-700">
              {roleConfig.label}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      
      <DropdownMenuSeparator />
      
      <div className="p-1">
        <DropdownMenuItem className="cursor-pointer rounded-md" onClick={handleSettings}>
          <Settings className="mr-3 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        {shouldShowTransferOwnership && <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="cursor-pointer rounded-md text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50" onClick={handleTransferOwnership}>
              <Crown className="mr-3 h-4 w-4" />
              <span>{t("transferOwnership.menu.label", "Transfer ownership")}</span>
            </DropdownMenuItem>
          </>}
        
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem className="cursor-pointer rounded-md text-red-600 focus:text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="mr-3 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>;
});
UserDropdown.displayName = 'UserDropdown';
export default UserDropdown;






