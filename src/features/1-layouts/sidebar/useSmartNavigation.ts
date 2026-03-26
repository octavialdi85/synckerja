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

  const PREFERRED_FALLBACKS: Record<string, string[]> = {
    '/employees': ['/employees/reprimand'],
    '/attendance': ['/attendance/attendance', '/attendance/settings'],
    '/expenses': ['/expenses/dashboard', '/expenses/debt', '/expenses/approvals'],
    '/incomes': ['/incomes/dashboard', '/incomes/transaction', '/incomes/transaction/bank-account'],
  };

  // Find first accessible page in a group of paths
  const findFirstAccessiblePath = (paths: string[]): string | null => {
    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
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

  // Smart navigate with lightweight fallback checks.
  const smartNavigate = (targetPath: string) => {
    if (targetPath === '/') {
      prefetchHomeData().catch(() => {});
    }

    if (isOwner || userRole === 'owner' || isAdmin || userRole === 'admin') {
      navigate(targetPath);
      return;
    }
    
    if (canAccessPage(targetPath)) {
      navigate(targetPath);
      return;
    }

    const preferred = PREFERRED_FALLBACKS[targetPath];
    if (preferred?.length) {
      const fallback = findFirstAccessiblePath(preferred);
      if (fallback) {
        navigate(fallback);
        return;
      }
    }

    const subPaths = getSubPaths(targetPath);
    if (subPaths.length > 0) {
      const firstAccessibleSubPath = findFirstAccessiblePath(subPaths);
      if (firstAccessibleSubPath) {
        navigate(firstAccessibleSubPath);
        return;
      }
    }

    const parentPath = '/' + targetPath.split('/')[1];
    const allSubPaths = getSubPaths(parentPath);
    if (allSubPaths.length > 0) {
      const firstAccessibleSubPath = findFirstAccessiblePath(allSubPaths);
      if (firstAccessibleSubPath) {
        navigate(firstAccessibleSubPath);
        return;
      }
    }

    const currentMenuItem = menuItems.find(item => 
      item.subSidebarItems?.some(sub => sub.url === targetPath)
    );
    
    if (currentMenuItem?.subSidebarItems) {
      const groupPaths = currentMenuItem.subSidebarItems.map(sub => sub.url);
      const firstAccessibleInGroup = findFirstAccessiblePath(groupPaths);
      if (firstAccessibleInGroup) {
        navigate(firstAccessibleInGroup);
        return;
      }
    }

    const allMainPaths = menuItems
      .filter(item => item.url && item.url !== '#')
      .map(item => item.url!);
    
    const firstAccessibleMain = findFirstAccessiblePath(allMainPaths);
    if (firstAccessibleMain) {
      navigate(firstAccessibleMain);
    } else {
      navigate('/');
    }
  };

  return {
    smartNavigate,
    findFirstAccessiblePath,
    canAccessPage
  };
};
