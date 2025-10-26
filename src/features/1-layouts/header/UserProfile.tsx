import React, { memo, useMemo } from "react";
import { Button } from "@/features/ui/button";
import { Crown, Shield, Users, User, ChevronDown } from "lucide-react";
import { UnifiedAvatar } from "@/features/share/UnifiedAvatar";

interface Profile {
  full_name: string;
  email: string;
  active_organization_id?: string | null;
  user_id?: string;
}

type UserRole = 'owner' | 'admin' | 'employee' | null;

interface UserProfileProps {
  profile: Profile | null;
  userRole: UserRole;
  organization?: any;
  onClick: () => void;
}

const isDev = import.meta.env.DEV;

const UserProfile = memo<UserProfileProps>(({ profile, userRole, organization, onClick }) => {
  
  const displayName = useMemo(() => 
    profile?.full_name || "User",
    [profile?.full_name]
  );

  const roleConfig = useMemo(() => {
    switch (userRole) {
      case 'owner':
        return {
          icon: <Crown className="h-3.5 w-3.5 text-yellow-600" />,
          label: 'Owner'
        };
      case 'admin':
        return {
          icon: <Shield className="h-3.5 w-3.5 text-blue-600" />,
          label: 'Admin'
        };
      case 'employee':
        return {
          icon: <Users className="h-3.5 w-3.5 text-green-600" />,
          label: 'Employee'
        };
      default:
        return {
          icon: <User className="h-3.5 w-3.5 text-gray-500" />,
          label: 'User'
        };
    }
  }, [userRole]);

  return (
    <Button 
      variant="ghost" 
      className="flex items-center gap-3 h-auto p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 pr-0"
      onClick={onClick}
    >
      {/* User Info - Hidden on mobile, positioned closer to right */}
      <div className="hidden md:flex flex-col items-end text-right min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate max-w-32">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {roleConfig.icon}
          <span className="font-medium">
            {roleConfig.label}
          </span>
        </div>
      </div>

      {/* Avatar and Dropdown */}
      <div className="flex items-center gap-2">
        <UnifiedAvatar 
          name={displayName}
          size="md"
        />
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
    </Button>
  );
});

UserProfile.displayName = 'UserProfile';

export default UserProfile;






