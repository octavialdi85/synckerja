import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * GLOBAL INDIVIDUAL OBJECTIVES SUBSCRIPTION MANAGER
 *
 * Manages a single real-time subscription for individual objectives
 * across ALL components and hooks.
 *
 * Features:
 * - Single subscription for entire app per organization
 * - Reference counting (auto cleanup when no subscribers)
 * - Works across all provider instances
 */

class GlobalIndividualObjectivesManager {
  private channel: RealtimeChannel | null = null;
  private subscriberCount: number = 0;
  private currentOrgId: string | null = null;
  private queryClient: QueryClient | null = null;

  /**
   * Subscribe to individual objectives real-time updates
   * Returns unsubscribe function
   */
  subscribe(organizationId: string, queryClient: QueryClient): () => void {
    const isDev = import.meta.env?.DEV;

    if (!this.queryClient) {
      this.queryClient = queryClient;
    }

    if (this.channel && this.currentOrgId === organizationId) {
      this.subscriberCount++;
      if (isDev) {
        console.log(`Global Individual Objectives: Subscriber #${this.subscriberCount} joined (reusing existing subscription)`);
      }
      return this.createUnsubscriber(organizationId);
    }

    if (this.channel && this.currentOrgId !== organizationId) {
      if (isDev) {
        console.log('Global Individual Objectives: Switching to new organization, cleaning up old subscription');
      }
      this.cleanup();
    }

    this.currentOrgId = organizationId;
    this.subscriberCount = 1;

    if (isDev) {
      console.log('Global Individual Objectives: Creating SINGLE global subscription for org:', organizationId);
    }

    this.channel = supabase
      .channel(`global_individual_objectives_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'individual_objectives',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (isDev) {
            console.log('Global Individual Objectives: Real-time update received', {
              event: payload.eventType,
              table: payload.table
            });
          }

          if (this.queryClient) {
            this.queryClient.invalidateQueries({
              queryKey: ['individual-objectives'],
              exact: false
            });
            this.queryClient.invalidateQueries({
              queryKey: ['individual-objectives', organizationId],
              exact: false
            });
          }
        }
      )
      .subscribe((status) => {
        if (isDev) {
          console.log('Global Individual Objectives: Subscription status:', status);
        }
      });

    return this.createUnsubscriber(organizationId);
  }

  private createUnsubscriber(organizationId: string): () => void {
    return () => {
      const isDev = import.meta.env?.DEV;

      if (organizationId !== this.currentOrgId) {
        return;
      }

      this.subscriberCount--;

      if (isDev) {
        console.log(`Global Individual Objectives: Subscriber left (${this.subscriberCount} remaining)`);
      }

      if (this.subscriberCount <= 0) {
        if (isDev) {
          console.log('Global Individual Objectives: No more subscribers, cleaning up subscription');
        }
        this.cleanup();
      }
    };
  }

  private cleanup(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentOrgId = null;
    this.subscriberCount = 0;
  }

  getStats() {
    return {
      subscriberCount: this.subscriberCount,
      currentOrgId: this.currentOrgId,
      hasActiveChannel: !!this.channel
    };
  }
}

export const globalIndividualObjectivesManager = new GlobalIndividualObjectivesManager();

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as any).globalIndividualObjectivesManager = globalIndividualObjectivesManager;
}
