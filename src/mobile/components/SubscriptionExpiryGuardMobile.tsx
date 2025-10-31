/**
 * Mobile-specific Subscription Expiry Guard
 * 
 * This component ensures that mobile routes are protected by subscription expiry checks.
 * Since mobile and desktop share the same routing structure in App.tsx,
 * the main SubscriptionExpiryGuard in @/components/SubscriptionExpiryGuard already
 * protects all mobile routes.
 * 
 * This file serves as documentation and can be used if mobile-specific
 * subscription expiry logic is needed in the future.
 */

import { ReactNode } from 'react';
import { SubscriptionExpiryGuard } from '@/components/SubscriptionExpiryGuard';

interface SubscriptionExpiryGuardMobileProps {
  children: ReactNode;
}

/**
 * Mobile wrapper for SubscriptionExpiryGuard
 * Currently uses the same guard as desktop since they share routing
 * 
 * Mobile routes that are protected:
 * - / (Absensi/Home)
 * - /profile
 * - /schedule
 * - /client-visit
 * - /reports
 * - All other mobile routes
 */
export const SubscriptionExpiryGuardMobile = ({ children }: SubscriptionExpiryGuardMobileProps) => {
  // Currently, mobile uses the same SubscriptionExpiryGuard as desktop
  // because they share the same routing structure in App.tsx
  // The guard wraps all Routes, including mobile routes
  
  return <SubscriptionExpiryGuard>{children}</SubscriptionExpiryGuard>;
};

