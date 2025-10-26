import { useMemo } from 'react';
import { menuItems, type MenuItem, type SubMenuItem } from './menuItems';
import { useDepartmentAccess } from './useDepartmentAccess';

export const useDepartmentFilteredMenu = () => {
  const { canAccessPage, hasAccessToAnySubPath, userRole, isOwner, isAdmin, configLoading } = useDepartmentAccess();
  
  const filteredMenuItems = useMemo(() => {
    // Always return all menu items without filtering
    // Access control is handled at the page level via DepartmentRouteGuard
    return menuItems;
  }, []);
  
  return filteredMenuItems;
};

// Re-export types
export type { MenuItem, SubMenuItem };
