import { useNavigate } from 'react-router-dom';
import { useDepartmentAccess } from './useDepartmentAccess';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { usePrefetchHomeData } from '@/hooks/useParallelHomeData';
import { menuItems } from './menuItems';

export const useSmartNavigation = () => {
  const navigate = useNavigate();
  const prefetchHomeData = usePrefetchHomeData();
  const { canAccessPage } = useDepartmentAccess();
  const { userRole, isOwner, isAdmin } = useCentralizedUserData();

  // Find first accessible page in a group of paths
  const findFirstAccessiblePath = (paths: string[]): string | null => {
    // OWNER/ADMIN OVERRIDE - Return first path directly
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      console.log('🔑 FIND PATH OVERRIDE: Owner/Admin gets first path:', paths[0]);
      return paths[0] || null;
    }

    for (const path of paths) {
      if (canAccessPage(path)) {
        return path;
      }
    }
    return null;
  };

  // Get all sub-paths for a main menu item
  const getSubPaths = (mainPath: string): string[] => {
    const menuItem = menuItems.find(item => item.url === mainPath);
    if (menuItem?.subSidebarItems) {
      return menuItem.subSidebarItems.map(sub => sub.url);
    }
    return [];
  };

  // Smart navigate with auto-redirect to first accessible page
  const smartNavigate = (targetPath: string) => {
    if (targetPath === '/') {
      prefetchHomeData().catch(() => {});
    }
    console.log('🚀 SmartNavigate called for:', targetPath);

    // OWNER/ADMIN OVERRIDE - Direct navigation without permission check
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      console.log('🔑 SMART NAVIGATE OVERRIDE: Owner/Admin direct access to:', targetPath);
      navigate(targetPath);
      return;
    }
    
    // If user can access the target path directly, navigate normally
    if (canAccessPage(targetPath)) {
      console.log('✅ Direct access granted to:', targetPath);
      navigate(targetPath);
      return;
    }

    console.log('🔒 Direct access denied to:', targetPath, '- searching for alternatives');

    // Special handling for main section paths like /employees, /recruitment, etc.
    const mainSectionPaths = ['/employees', '/recruitment', '/attendance', '/leave-permit', '/contract', '/training', '/payroll', '/company', '/expenses', '/incomes'];
    
    if (mainSectionPaths.includes(targetPath)) {
      // For /employees specifically, try to find accessible tab
      if (targetPath === '/employees') {
        const employeeTabs = ['/employees/reprimand'];
        const firstAccessibleTab = findFirstAccessiblePath(employeeTabs);
        if (firstAccessibleTab) {
          console.log('✅ Redirecting to accessible employee tab:', firstAccessibleTab);
          navigate(firstAccessibleTab);
          return;
        }
      }
      
      // For /attendance specifically, try to find accessible tab
      if (targetPath === '/attendance') {
        const attendanceTabs = ['/attendance/attendance', '/attendance/settings'];
        const firstAccessibleTab = findFirstAccessiblePath(attendanceTabs);
        if (firstAccessibleTab) {
          console.log('✅ Redirecting to accessible attendance tab:', firstAccessibleTab);
          navigate(firstAccessibleTab);
          return;
        }
        // Fallback to /attendance (dashboard) if no accessible tab found
        // This will show access denied if user doesn't have permission
        navigate('/attendance');
        return;
      }
      
      // For other main sections, try common sub-paths
      const commonSubPaths = [`${targetPath}/overview`, `${targetPath}/dashboard`, `${targetPath}/list`, `${targetPath}/management`];
      const firstAccessibleSubPath = findFirstAccessiblePath(commonSubPaths);
      if (firstAccessibleSubPath) {
        console.log('✅ Redirecting to accessible sub-path:', firstAccessibleSubPath);
        navigate(firstAccessibleSubPath);
        return;
      }
    }

    // Check if it's a main menu path with sub-items from menuItems
    const subPaths = getSubPaths(targetPath);
    if (subPaths.length > 0) {
      const firstAccessibleSubPath = findFirstAccessiblePath(subPaths);
      if (firstAccessibleSubPath) {
        console.log('✅ Redirecting to accessible sub-path from menu:', firstAccessibleSubPath);
        navigate(firstAccessibleSubPath);
        return;
      }
    }

    // Check if it's a sub-path, try to find accessible sibling
    const parentPath = '/' + targetPath.split('/')[1]; // Get main section
    const allSubPaths = getSubPaths(parentPath);
    if (allSubPaths.length > 0) {
      const firstAccessibleSubPath = findFirstAccessiblePath(allSubPaths);
      if (firstAccessibleSubPath) {
        console.log('✅ Redirecting to accessible sibling path:', firstAccessibleSubPath);
        navigate(firstAccessibleSubPath);
        return;
      }
    }

    // For tab-based navigation (like /employees/reprimand)
    const pathParts = targetPath.split('/');
    if (pathParts.length >= 3) {
      const basePath = `/${pathParts[1]}`;
      const tabPaths = [
        `${basePath}/reprimand`,
        `${basePath}/overview`,
        `${basePath}/dashboard`,
        `${basePath}/management`,
        `${basePath}/roles`, 
        `${basePath}/pages`,
        `${basePath}/tutorial`
      ];
      
      const firstAccessibleTab = findFirstAccessiblePath(tabPaths);
      if (firstAccessibleTab) {
        console.log('✅ Redirecting to accessible tab:', firstAccessibleTab);
        navigate(firstAccessibleTab);
        return;
      }
    }

    // Try to find accessible paths within the same menu group
    const currentMenuItem = menuItems.find(item => 
      item.subSidebarItems?.some(sub => sub.url === targetPath)
    );
    
    if (currentMenuItem?.subSidebarItems) {
      const groupPaths = currentMenuItem.subSidebarItems.map(sub => sub.url);
      const firstAccessibleInGroup = findFirstAccessiblePath(groupPaths);
      if (firstAccessibleInGroup) {
        console.log('✅ Redirecting to accessible path in same group:', firstAccessibleInGroup);
        navigate(firstAccessibleInGroup);
        return;
      }
    }

    console.log('🔍 No accessible alternatives found, trying fallback options...');

    // Fallback: find any accessible main menu item
    const allMainPaths = menuItems
      .filter(item => item.url && item.url !== '#')
      .map(item => item.url!);
    
    const firstAccessibleMain = findFirstAccessiblePath(allMainPaths);
    if (firstAccessibleMain) {
      console.log('✅ Fallback: Redirecting to accessible main menu item:', firstAccessibleMain);
      navigate(firstAccessibleMain);
    } else {
      // Ultimate fallback to dashboard
      console.log('⚠️ Ultimate fallback: Redirecting to dashboard');
      navigate('/');
    }
  };

  return {
    smartNavigate,
    findFirstAccessiblePath,
    canAccessPage
  };
};
