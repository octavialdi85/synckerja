import { useEffect, useRef, useState, type TransitionEvent } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent } from "@/features/ui/sidebar";
import { useDepartmentFilteredMenu, type MenuItem, type SubMenuItem } from "./useDepartmentFilteredMenu";
import { useSidebarState } from "./useSidebarState";
import { useSmartNavigation } from "./useSmartNavigation";
import { useDepartmentAccess } from "./useDepartmentAccess";
import { useCentralizedUserData } from "@/features/1-login/contexts/CentralizedUserDataContext";
import { useWhatsAppUnreadCount } from "@/features/5-3-whatsapp/hooks/useWhatsAppUnreadCount";
import { LiveChatAppBadgeSync } from "@/features/5-3-whatsapp/components/LiveChatAppBadgeSync";
import { ChevronRight, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
// Sub-sidebar component (merged from SubSidebar.tsx)
interface SubSidebarProps {
  items: SubMenuItem[];
  isOpen: boolean;
  title: string;
  titleKey?: string;
  whatsAppUnreadCount?: number;
}

function SubSidebarInternal({ items, isOpen, title, titleKey, whatsAppUnreadCount = 0 }: SubSidebarProps) {
  const location = useLocation();
  const { smartNavigate } = useSmartNavigation();
  const { canAccessPage, configLoading } = useDepartmentAccess();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();
  const { t } = useAppTranslation();
  const resolvedTitle = t(titleKey, title);

  const hasAnyAccessibleSubItem = (mainPath: string) => {
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
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
        '/tools/calculator/services',
        '/tools/calculator/sales',
        '/tools/pph21-calculator',
        '/tools/pricing-tools',
        '/tools/promo-simulation'
      ],
      '/digital-marketing': [
        '/digital-marketing',
        '/digital-marketing/social-media',
        '/kol-management/dashboard',
        '/kol-management/kol-management',
        '/kol-management/campaigns',
        '/kol-management/content-post',
        '/kol-management/payment-terms',
        '/kol-management/analytics'
      ],
      '/subscription': [
        '/subscription',
        '/subscription/overview',
        '/subscription/plans',
        '/subscription/management'
      ],
      '/incomes': [
        '/incomes',
        '/incomes/dashboard',
        '/incomes/transaction'
      ],
      '/expenses': [
        '/expenses',
        '/expenses/dashboard',
        '/expenses/approvals',
        '/expenses/payment-process',
        '/expenses/reminder-bills'
      ],
      '/operations': [
        '/operations',
        '/operations/sales',
        '/operations/consultant',
        '/operations/consultant/dashboard',
        '/operations/consultant/leads-management',
        '/operations/consultant/whatsapp/connect',
        '/operations/consultant/instagram/connect',
        '/operations/consultant/email/connect',
        '/operations/consultant/all/livechat'
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

  const isItemAccessible = (itemUrl: string, checkSubPaths: boolean = false): boolean => {
    if (isOwner || userRole === 'owner') {
      return true;
    }

    if (isAdmin || userRole === 'admin') {
      return true;
    }
    
    const directAccess = canAccessPage(itemUrl);
    
    if (directAccess) {
      return true;
    }
    
    if (!checkSubPaths) {
      return false;
    }
    
    const subPathAccess = hasAnyAccessibleSubItem(itemUrl);
    return subPathAccess;
  };

  return (
    <div
      className="h-full w-64 overflow-hidden bg-white font-sans antialiased transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateX(0)' : 'translateX(-0.5rem)',
      }}
    >
      <div className="flex h-full w-64 flex-col border-r border-gray-200 shadow-sm">
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
                    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
                      smartNavigate(item.url);
                    } else if (hasAccess) {
                      smartNavigate(item.url);
                    } else if (configLoading) {
                      smartNavigate(item.url);
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
                    transform: isOpen ? 'translateX(0)' : 'translateX(-8px)',
                    opacity: isOpen ? 1 : 0,
                    transition: `opacity 0.25s ease-in-out ${index * 25}ms, transform 0.25s ease-in-out ${index * 25}ms`,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '-0.01em',
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

                  {/* WhatsApp / Livechat badge: new messages count */}
                  {item.url === '/operations/consultant/all/livechat' && whatsAppUnreadCount > 0 && (
                    <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center">
                      {whatsAppUnreadCount > 99 ? '99+' : whatsAppUnreadCount}
                    </span>
                  )}
                  
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
  const { data: whatsAppUnreadCount = 0 } = useWhatsAppUnreadCount();
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
  const activeMenuItem = menuItems.find(
    (item) => item.title === activeSubSidebar && item.hasSubSidebar && item.subSidebarItems
  );
  const subSidebarOpen = Boolean(activeSubSidebar && activeMenuItem);

  /** Without a paint at w-0 before w-64, WebKit/Chromium often skip width transition when content mounts in the same commit (e.g. hover no-sub → sub). */
  const [subSidebarPaintOpen, setSubSidebarPaintOpen] = useState(false);
  const prevSubSidebarOpenRef = useRef(false);

  useEffect(() => {
    if (!subSidebarOpen) {
      setSubSidebarPaintOpen(false);
      prevSubSidebarOpenRef.current = false;
      return;
    }

    const wasAlreadyOpen = prevSubSidebarOpenRef.current;
    prevSubSidebarOpenRef.current = true;

    if (!wasAlreadyOpen) {
      setSubSidebarPaintOpen(false);
      let raf1 = 0;
      let raf2 = 0;
      let cancelled = false;
      raf1 = requestAnimationFrame(() => {
        if (cancelled) return;
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setSubSidebarPaintOpen(true);
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    setSubSidebarPaintOpen(true);
  }, [subSidebarOpen]);

  const subSidebarMeasuredOpen = subSidebarOpen && subSidebarPaintOpen;

  /** Keep sub-menu content mounted while width collapses so the browser can animate w-64 → w-0 smoothly. */
  const [subMenuSnapshot, setSubMenuSnapshot] = useState<MenuItem | null>(null);
  useEffect(() => {
    if (activeMenuItem) {
      setSubMenuSnapshot(activeMenuItem);
    }
  }, [activeMenuItem]);

  const panelContentMenu =
    activeMenuItem ??
    (subMenuSnapshot?.hasSubSidebar && subMenuSnapshot.subSidebarItems ? subMenuSnapshot : null);

  const handleSubSidebarPanelTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'width') return;
    if (!subSidebarOpen && !subSidebarPaintOpen) {
      setSubMenuSnapshot(null);
    }
  };

  /** During collapse, stay visible inside the clipping panel until width finishes (avoid opacity fade fighting width). */
  const isSubContentVisible =
    subSidebarMeasuredOpen || Boolean(panelContentMenu && !subSidebarOpen);

  return (
    <div className="relative flex h-full">
      <LiveChatAppBadgeSync />
      {/* Parent: main sidebar + sub-sidebar (child) share one positioned group */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative z-20 transition-[margin] duration-300 ease-in-out motion-reduce:transition-none"
      >
        <Sidebar
          collapsible="icon"
          className="top-16 fixed left-0 z-20 h-full border-r border-gray-200 bg-white shadow-none transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            height: 'calc(100vh - 4rem)',
          }}
        >
          <SidebarContent className="overflow-hidden">
            <div className="flex-1 overflow-y-auto seamless-scroll py-4">
              <div className="space-y-1 px-1">
                {menuItems.map((item) => {
                  const localizedTitle = t(item.titleKey, item.title);
                  const showWhatsAppBadge = false;
                  return (
                    <div key={item.title}>
                      <div
                        onMouseEnter={() => handleMenuItemHover(item.title, item.hasSubSidebar || false)}
                        className="group/item relative"
                      >
                        {item.url && item.url !== '#' ? (
                          <button
                            type="button"
                            onClick={() => smartNavigate(item.url!)}
                            className={cn(
                              'group relative flex w-full items-center justify-between text-left font-medium transition-colors duration-200 ease-in-out motion-reduce:transition-none',
                              'rounded-lg py-2.5 px-3',
                              'hover:bg-blue-50 hover:text-blue-600',
                              'group-data-[collapsible=icon]:justify-center',
                              item.url === '/'
                                ? currentPath === '/'
                                  ? 'rounded-lg bg-blue-50 text-blue-600'
                                  : 'text-gray-700'
                                : currentPath.startsWith(item.url)
                                  ? 'rounded-lg bg-blue-50 text-blue-600'
                                  : 'text-gray-700'
                            )}
                          >
                            <div className="flex min-w-0 items-center">
                              <item.icon
                                className={cn(
                                  'mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-data-[collapsible=icon]:mx-auto',
                                  'group-hover:scale-110'
                                )}
                              />
                              <span
                                className={cn(
                                  'w-auto whitespace-nowrap text-sm font-medium opacity-100 transition-opacity duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:opacity-0'
                                )}
                              >
                                {localizedTitle}
                              </span>
                            </div>
                            {item.hasSubSidebar && (
                              <ChevronRight
                                className={cn(
                                  'ml-auto h-3 w-3 flex-shrink-0 opacity-60 transition-all duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-hover:translate-x-1 group-hover:opacity-100',
                                  'group-data-[collapsible=icon]:hidden'
                                )}
                              />
                            )}
                            {!item.hasSubSidebar && isItemLocked(item) && (
                              <Lock
                                className={cn(
                                  'ml-auto h-3 w-3 flex-shrink-0 text-gray-400',
                                  'group-data-[collapsible=icon]:hidden'
                                )}
                              />
                            )}
                          </button>
                        ) : (
                          <div
                            className={cn(
                              'group relative flex cursor-pointer items-center justify-between rounded-lg py-2.5 px-2 font-medium transition-colors duration-200 ease-in-out motion-reduce:transition-none',
                              'hover:scale-105 hover:bg-gray-100',
                              'group-data-[collapsible=icon]:justify-center',
                              activeSubSidebar === item.title
                                ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-600'
                                : ''
                            )}
                          >
                            <div className="flex min-w-0 items-center">
                              <item.icon
                                className={cn(
                                  'mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-data-[collapsible=icon]:mx-auto',
                                  'group-hover:scale-110'
                                )}
                              />
                              <span
                                className={cn(
                                  'w-auto whitespace-nowrap text-sm font-medium opacity-100 transition-opacity duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:opacity-0'
                                )}
                              >
                                {localizedTitle}
                              </span>
                            </div>
                            {showWhatsAppBadge && (
                              <span className="mr-2 flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-medium text-white group-data-[collapsible=icon]:hidden">
                                {whatsAppUnreadCount > 99 ? '99+' : whatsAppUnreadCount}
                              </span>
                            )}
                            {item.hasSubSidebar && (
                              <ChevronRight
                                className={cn(
                                  'ml-auto h-3 w-3 flex-shrink-0 opacity-60 transition-all duration-200 ease-in-out motion-reduce:transition-none',
                                  'group-hover:translate-x-1 group-hover:opacity-100',
                                  'group-data-[collapsible=icon]:hidden'
                                )}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Sub-sidebar: child of main sidebar group (anchored to primary column) */}
        <div
          role="complementary"
          aria-hidden={!subSidebarOpen}
          onMouseEnter={handleSubSidebarMouseEnter}
          onMouseLeave={handleSubSidebarMouseLeave}
          onTransitionEnd={handleSubSidebarPanelTransitionEnd}
          className={cn(
            'pointer-events-none absolute left-full top-0 z-10 overflow-hidden',
            'h-[calc(100vh-4rem)]',
            'transition-[width,opacity,transform] duration-300 ease-in-out motion-reduce:transition-none',
            subSidebarMeasuredOpen
              ? 'pointer-events-auto w-64 translate-x-0 opacity-100'
              : 'w-0 -translate-x-1 opacity-0'
          )}
        >
          {panelContentMenu?.subSidebarItems && (
            <SubSidebarInternal
              key={panelContentMenu.title}
              items={panelContentMenu.subSidebarItems}
              isOpen={isSubContentVisible}
              title={panelContentMenu.title}
              titleKey={panelContentMenu.titleKey}
              whatsAppUnreadCount={panelContentMenu.title === 'Operations' ? whatsAppUnreadCount : 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
