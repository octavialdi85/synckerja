import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/features/ui/sidebar";
import { useDepartmentFilteredMenu, type MenuItem, type SubMenuItem } from "./useDepartmentFilteredMenu";
import { useSidebarState } from "./useSidebarState";
import { useSmartNavigation } from "./useSmartNavigation";
import { useDepartmentAccess } from "./useDepartmentAccess";
import { useCentralizedUserData } from "@/features/1-login/contexts/CentralizedUserDataContext";
import { Building2, ChevronRight, X, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
// Sub-sidebar component (merged from SubSidebar.tsx)
interface SubSidebarProps {
  items: SubMenuItem[];
  isOpen: boolean;
  title: string;
  titleKey?: string;
}

function SubSidebarInternal({ items, isOpen, title, titleKey }: SubSidebarProps) {
  const location = useLocation();
  const { smartNavigate } = useSmartNavigation();
  const { canAccessPage, configLoading } = useDepartmentAccess();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();
  const { t } = useAppTranslation();
  const resolvedTitle = t(titleKey, title);

  // Check if any sub-item is accessible for a main section
  const hasAnyAccessibleSubItem = (mainPath: string) => {
    // OWNER/ADMIN OVERRIDE - They can access any sub-paths
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      console.log('🔑 SIDEBAR SUB-PATH OVERRIDE: Admin/Owner can access sub-paths for', mainPath);
      return true;
    }

    // Define known sub-paths for each main section based on permission configurations
    const subPathMappings: Record<string, string[]> = {
      '/employees': [
        '/employees/reprimand',
        '/employee-management',  // Maps to /employees in routing
        '/access-permissions/page-access'
      ],
      '/attendance': [
        '/attendance',
        '/attendance/attendance',
        '/attendance/settings'
      ],
      '/tools': [
        '/password-manager',
        '/tools/daily-task',
        '/tools/campaign-calculator/services',
        '/tools/campaign-calculator/sales'
      ],
      '/digital-marketing': [
        '/digital-marketing',
        '/digital-marketing/social-media'
      ],
      '/subscription': [
        '/subscription',
        '/subscription/overview',
        '/subscription/plans',
        '/subscription/management'
      ],
      '/admin': [
        '/admin',
        '/admin/settings',
        '/admin/users'
      ],
      '/users': [
        '/users/permissions',
        '/users/roles'
      ],
      '/access-permissions': [
        '/access-permissions',
        '/access-permissions/page-access',
        '/access-permissions/pages',
        '/access-permissions/roles',
        '/access-permissions/users'
      ]
    };
    
    const subPaths = subPathMappings[mainPath] || [];
    return subPaths.some(subPath => canAccessPage(subPath));
  };

  // Determine if a sidebar item should be accessible
  // For sub-sidebar items, we only check direct access (no sub-path fallback)
  const isItemAccessible = (itemUrl: string, checkSubPaths: boolean = false): boolean => {
    // SPECIFIC DEBUG FOR PAGE ACCESS
    if (itemUrl === '/access-permissions/page-access') {
      console.group('🔍 PAGE ACCESS SIDEBAR DEBUG');
      console.log('URL:', itemUrl);
      console.log('User Role:', userRole);
      console.log('Is Owner:', isOwner);
      console.log('Is Admin:', isAdmin);
      console.log('Check Sub Paths:', checkSubPaths);
    }

    // OWNER OVERRIDE - Owner can see all menu items
    if (isOwner || userRole === 'owner') {
      if (itemUrl === '/access-permissions/page-access') {
        console.log('🔑 SIDEBAR OWNER OVERRIDE: Showing Page Access menu item');
        console.groupEnd();
      }
      return true;
    }

    // ADMIN OVERRIDE - Admin can see most menu items 
    if (isAdmin || userRole === 'admin') {
      if (itemUrl === '/access-permissions/page-access') {
        console.log('🔧 SIDEBAR ADMIN OVERRIDE: Showing Page Access menu item');
        console.groupEnd();
      }
      return true;
    }
    
    // For other roles, check permissions normally
    // First check direct access to the path
    const directAccess = canAccessPage(itemUrl);
    if (itemUrl === '/access-permissions/page-access') {
      console.log('🔍 Direct Access Result:', directAccess);
    }
    
    if (directAccess) {
      if (itemUrl === '/access-permissions/page-access') {
        console.log('✅ PAGE ACCESS: Direct access granted');
        console.groupEnd();
      }
      return true;
    }
    
    // For sub-sidebar items, don't check sub-paths - only direct access matters
    // This ensures padlock appears correctly for items that are locked
    if (!checkSubPaths) {
      if (itemUrl === '/access-permissions/page-access') {
        console.log('❌ SUB-SIDEBAR ITEM: Direct access denied - item will be locked');
        console.groupEnd();
      }
      return false;
    }
    
    // If direct access is denied, check if any sub-paths are accessible (only for main sidebar items)
    const subPathAccess = hasAnyAccessibleSubItem(itemUrl);
    if (itemUrl === '/access-permissions/page-access') {
      console.log('🔍 Sub-path Access Result:', subPathAccess);
      console.log('❌ PAGE ACCESS: Access denied - item will be locked');
      console.groupEnd();
    }
    return subPathAccess;
  };

  return (
    <div 
      className={`fixed top-16 left-64 bg-white border-r border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ease-out z-50 ${
        isOpen 
          ? 'w-64 opacity-100 translate-x-0' 
          : 'w-0 opacity-0 -translate-x-2'
      }`}
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: 'calc(100vh - 4rem)'
      }}
    >
      <div className="h-full flex flex-col w-64">
        {/* Header with main navigation title */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {resolvedTitle}
          </h3>
        </div>

        {/* Menu Items */}
        <div className="flex-1 pt-2 overflow-y-auto seamless-scroll">
          <nav className="space-y-0">
            {items.map((item, index) => {
              // For sub-sidebar items, only check direct access (no sub-path fallback)
              // This ensures padlock appears correctly for locked items
              const hasAccess = isItemAccessible(item.url, false);
              const isActive = location.pathname === item.url;
              
              return (
                <button
                  key={item.url}
                  onClick={() => {
                    // ENHANCED NAVIGATION - Owner/Admin always can navigate
                    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
                      console.log('🔑 SIDEBAR NAVIGATION OVERRIDE: Allowing navigation to', item.url);
                      smartNavigate(item.url);
                    } else if (hasAccess) {
                      smartNavigate(item.url);
                    } else if (configLoading) {
                      // During loading, allow navigation - the route protection will handle actual access control
                      console.log('⏳ LOADING NAVIGATION: Allowing navigation during loading to', item.url);
                      smartNavigate(item.url);
                    } else {
                      console.log('❌ SIDEBAR: Navigation blocked for', item.url, 'due to insufficient permissions');
                    }
                  }}
                  disabled={!hasAccess && !isOwner && !isAdmin && userRole !== 'owner' && userRole !== 'admin' && !configLoading}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 text-[15px] font-normal transition-all duration-200 group w-full text-left
                    ${configLoading
                      ? 'text-gray-500 cursor-default opacity-80'
                      : (!hasAccess && !isOwner && !isAdmin && userRole !== 'owner' && userRole !== 'admin') 
                        ? 'text-gray-400 cursor-not-allowed opacity-60'
                        : isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  style={{
                    transform: isOpen 
                      ? 'translateX(0)' 
                      : 'translateX(-10px)',
                    opacity: isOpen ? 1 : 0,
                    transition: `all 0.2s ease-out ${index * 20}ms`,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '-0.01em'
                  }}
                >
                  <div className={`
                    w-0.5 h-0.5 rounded-full flex-shrink-0 transition-colors duration-200
                    ${!hasAccess
                      ? 'bg-red-400'
                      : isActive 
                        ? 'bg-blue-600' 
                        : 'bg-gray-400 group-hover:bg-gray-500'
                    }
                  `} />
                  <span className="truncate flex-1">
                    {t(item.titleKey, item.title)}
                  </span>
                  
                  {/* Loading indicator */}
                  {configLoading && (
                    <Loader2 className="w-3 h-3 text-blue-500 flex-shrink-0 animate-spin" />
                  )}
                  
                  {/* Locked indicator - Only show for non-Owner/Admin when not loading */}
                  {!configLoading && (!hasAccess && !isOwner && !isAdmin && userRole !== 'owner' && userRole !== 'admin') && (
                    <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                  
                  {/* Active indicator - positioned at the very left edge */}
                  {isActive && (hasAccess || isOwner || isAdmin || userRole === 'owner' || userRole === 'admin') && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const menuItems = useDepartmentFilteredMenu();
  const { smartNavigate } = useSmartNavigation();
  const {
    activeSubSidebar,
    handleMouseEnter,
    handleMouseLeave,
    handleMenuItemHover,
    handleSubSidebarMouseEnter,
    handleSubSidebarMouseLeave
  } = useSidebarState();
  const { canAccessPage, configLoading } = useDepartmentAccess();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();
  const currentPath = location.pathname;
  const { t } = useAppTranslation();

  // Check if a sidebar item (without sub-sidebar) is locked
  const isItemLocked = (item: MenuItem): boolean => {
    // Don't show padlock for items with sub-sidebar
    if (item.hasSubSidebar) {
      return false;
    }

    // Owner/Admin can access all items
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      return false;
    }

    // If item has URL, check if it's accessible
    if (item.url && item.url !== "#") {
      // During loading, don't show padlock
      if (configLoading) {
        return false;
      }
      return !canAccessPage(item.url);
    }

    return false;
  };
  return <div className="relative flex h-full">
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="transition-all duration-300 ease-out group">
        <Sidebar collapsible="icon" className="border-r h-full bg-white shadow-none border-gray-200 transition-all duration-300 ease-out top-16 fixed left-0" style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: 'calc(100vh - 4rem)'
      }}>
          {/* Company Header - Enhanced Branding */}
          

          <SidebarContent className="overflow-hidden">
            <div className="flex-1 py-4 overflow-y-auto seamless-scroll">
              <div className="space-y-1 px-1">
                {menuItems.map((item, index) => {
                  const localizedTitle = t(item.titleKey, item.title);
                  return <div key={item.title}>
                    <div onMouseEnter={() => handleMenuItemHover(item.title, item.hasSubSidebar || false)} className="relative group/item">
                      {item.url && item.url !== "#" ? <button
                        onClick={() => smartNavigate(item.url!)}
                        className={cn("flex items-center font-medium transition-all duration-150 relative group w-full text-left", "hover:bg-blue-50 hover:text-blue-600 rounded-lg", "py-2.5 px-3", "group-data-[collapsible=icon]:justify-center justify-between", item.url === "/" ? currentPath === "/" : currentPath.startsWith(item.url) ? "bg-blue-50 text-blue-600 rounded-lg" : "text-gray-700")}
                      >
                        <div className="flex items-center min-w-0">
                          <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-150", "group-data-[collapsible=icon]:mx-auto mr-3", "group-hover:scale-110")} />
                          <span className={cn("transition-all duration-150 text-sm font-medium whitespace-nowrap", "group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden w-auto opacity-100")}>
                            {localizedTitle}
                          </span>
                        </div>
                        {item.hasSubSidebar && <ChevronRight className={cn("h-3 w-3 ml-auto opacity-60 transition-all duration-150 flex-shrink-0", "group-hover:opacity-100 group-hover:translate-x-1", "group-data-[collapsible=icon]:hidden")} />}
                        {!item.hasSubSidebar && isItemLocked(item) && (
                          <Lock className={cn("h-3 w-3 text-gray-400 flex-shrink-0 ml-auto", "group-data-[collapsible=icon]:hidden")} />
                        )}
                      </button> : <div className={cn("flex items-center font-medium transition-all duration-150 relative group cursor-pointer", "hover:bg-gray-100 hover:scale-105 rounded-lg", "py-2.5 px-2", "group-data-[collapsible=icon]:justify-center justify-between", activeSubSidebar === item.title ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600" : "")}>
                        <div className="flex items-center min-w-0">
                          <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-150", "group-data-[collapsible=icon]:mx-auto mr-3", "group-hover:scale-110")} />
                          <span className={cn("transition-all duration-150 text-sm font-medium whitespace-nowrap", "group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden w-auto opacity-100")}>
                            {localizedTitle}
                          </span>
                        </div>
                        {item.hasSubSidebar && <ChevronRight className={cn("h-3 w-3 ml-auto opacity-60 transition-all duration-150 flex-shrink-0", "group-hover:opacity-100 group-hover:translate-x-1", "group-data-[collapsible=icon]:hidden")} />}
                      </div>}
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Sub-sidebar */}
      {activeSubSidebar && <div onMouseEnter={handleSubSidebarMouseEnter} onMouseLeave={handleSubSidebarMouseLeave}>
          {menuItems.map(item =>
            item.title === activeSubSidebar && item.subSidebarItems && item.hasSubSidebar ? (
              <SubSidebarInternal
                key={item.title}
                items={item.subSidebarItems}
                isOpen={true}
                title={item.title}
                titleKey={item.titleKey}
              />
            ) : null,
          )}
        </div>}
    </div>;
}
