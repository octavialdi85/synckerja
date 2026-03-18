import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { addMonths, addYears, differenceInDays, startOfToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/**
 * Computes "next billing date" from payment history using the same logic as PaymentHistory:
 * - Early payment (pay before due): next = scheduled due + 1 month
 * - On-time/late: next = payment date + 1 month
 * Use this so Overview and Management show the same next date and days remaining as Payment History.
 */
export function useNextBillingFromPayments(organizationId: string | undefined) {
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-history-next-billing', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('id, created_at, billing_cycle, subscription_start_date, subscription_end_date, status')
        .eq('organization_id', organizationId)
        .in('status', ['success', 'settlement', 'paid'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
  });

  const computed = useMemo(() => {
    const successful = (payments as any[]).filter(
      (p) => p.status === 'success' || p.status === 'settlement' || p.status === 'paid'
    );
    if (successful.length === 0) {
      return { nextBillingDate: null as Date | null, daysUntilExpiry: 0 };
    }

    const sorted = [...successful].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const nextMap = new Map<string, Date>();
    let prevNext: Date | null = null;
    for (const p of sorted) {
      const created = p.created_at ? new Date(p.created_at) : null;
      const cycle = p.billing_cycle === 'yearly' ? 12 : 1;
      const addOne = (d: Date) => (cycle === 12 ? addYears(d, 1) : addMonths(d, 1));
      let next: Date | null = null;
      const startFromDb = p.subscription_start_date ? new Date(p.subscription_start_date) : null;
      const endFromDb = p.subscription_end_date ? new Date(p.subscription_end_date) : null;
      const useDb = endFromDb && startFromDb && created && startFromDb.getTime() <= created.getTime();
      if (useDb) {
        next = endFromDb;
      } else if (created) {
        if (prevNext && created.getTime() < prevNext.getTime()) {
          next = addOne(prevNext);
        } else {
          next = addOne(created);
        }
      }
      if (next) nextMap.set(p.id, next);
      prevNext = next;
    }
    const lastPayment = sorted[sorted.length - 1];
    const nextBillingDate = lastPayment ? nextMap.get(lastPayment.id) ?? null : null;
    const today = startOfToday();
    const daysUntilExpiry = nextBillingDate
      ? Math.max(0, differenceInDays(nextBillingDate, today))
      : 0;

    return { nextBillingDate, daysUntilExpiry };
  }, [payments]);

  return { ...computed, paymentsLoading };
}
