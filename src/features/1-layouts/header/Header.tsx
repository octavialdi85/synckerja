import React, { memo, useMemo, useCallback } from "react";
import { DropdownMenu, DropdownMenuTrigger } from "@/features/ui/dropdown-menu";
import { useUserData } from "@/features/1-login/hooks/useUserData";
import UserProfile from "./UserProfile";
import UserDropdown from "@/features/1-layouts/header/UserDropdown";
import OrganizationSwitcher from "./OrganizationSwitcher";
import { HeaderNotificationsBell } from "./HeaderNotificationsBell";

const isDev = import.meta.env.DEV;
const shouldLog = isDev && Math.random() < 0.02; // Only log 2% in dev

const Header = memo(() => {
  const { profile, organization, userRole, loading } = useUserData();

  // Memoize props to prevent unnecessary re-renders
  const memoizedProps = useMemo(() => ({
    profile,
    userRole,
    organization
  }), [profile, userRole, organization]);

  const handleProfileClick = useCallback(() => {
    if (shouldLog) console.log("Profile clicked");
  }, []);

  // Show skeleton header instead of blocking - header should always render
  // The actual loading state is handled by ProtectedRoute
  if (loading) {
    return (
      <header className="border-b bg-white fixed top-0 left-0 right-0 z-30 w-full shadow-sm">
        <div className="h-16 flex items-center justify-between w-full px-4">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white fixed top-0 left-0 right-0 z-30 shadow-sm w-full">
      <div className="h-16 flex items-center justify-between w-full px-4">
        {/* Organization Switcher - positioned at the left edge */}
        <div className="flex items-center -ml-2">
          <OrganizationSwitcher />
        </div>

        {/* Profile Section - positioned at the right */}
        <div className="flex items-center gap-2">
          <HeaderNotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <UserProfile 
                  {...memoizedProps}
                  onClick={handleProfileClick} 
                />
              </div>
            </DropdownMenuTrigger>
            <UserDropdown profile={profile} userRole={userRole} />
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
