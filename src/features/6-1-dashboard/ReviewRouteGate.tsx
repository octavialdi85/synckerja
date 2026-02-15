import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingDots } from '@/components/LoadingDots';
import { useIsMobile } from '@/mobile/hooks/use-mobile';
import PublicContentReviewPage from './pages/PublicContentReviewPage';

/**
 * Gate for /review/:token. Uses a single getSession() call so logged-in users
 * are redirected to the dashboard preview modal quickly, without waiting for
 * full AuthContext initialization (getSession + getUser + retries).
 */
export const ReviewRouteGate: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const isViewportMobile = useIsMobile();
  const isMobileUserAgent = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  const isMobile = isViewportMobile || isMobileUserAgent;

  useEffect(() => {
    if (!token?.trim()) {
      setChecking(false);
      setHasSession(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user) {
          setHasSession(true);
        } else if (!cancelled) {
          setHasSession(false);
        }
      } catch {
        if (!cancelled) setHasSession(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <LoadingDots size="lg" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasSession === true && token?.trim()) {
    if (isMobile) {
      return <PublicContentReviewPage />;
    }
    return (
      <Navigate
        to={`/digital-marketing/social-media/dashboard?review=${encodeURIComponent(token.trim())}`}
        replace
      />
    );
  }

  return <PublicContentReviewPage />;
};
