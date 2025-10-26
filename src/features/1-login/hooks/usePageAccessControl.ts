
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/1-login/contexts/AuthContext';

interface PageAccessControlOptions {
  requiresAuth?: boolean;
  allowedForNewUsersOnly?: boolean;
  allowedForUnverifiedUsers?: boolean;
  redirectTo?: string;
}

export const usePageAccessControl = (options: PageAccessControlOptions = {}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const {
    requiresAuth = true,
    allowedForNewUsersOnly = false,
    allowedForUnverifiedUsers = false,
    redirectTo = '/login'
  } = options;

  useEffect(() => {
    if (loading) return;

    // If auth is not required, allow access
    if (!requiresAuth) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    // If auth is required and user is not authenticated
    if (requiresAuth && !user) {
      setHasAccess(false);
      setIsChecking(false);
      navigate(redirectTo);
      return;
    }

    // If user is authenticated
    if (user) {
      // Check if page is only for new users
      if (allowedForNewUsersOnly) {
        // Allow access for new users or if explicitly allowed for unverified users
        setHasAccess(true);
      } else {
        // Normal authenticated access
        setHasAccess(true);
      }
    }

    setIsChecking(false);
  }, [user, loading, requiresAuth, allowedForNewUsersOnly, allowedForUnverifiedUsers, redirectTo, navigate]);

  return { isChecking, hasAccess };
};
