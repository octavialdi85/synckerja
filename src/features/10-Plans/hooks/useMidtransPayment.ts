
import { useState } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
      hide?: () => void;
      [key: string]: any;
    };
  }
}

interface PaymentParams {
  planId: string;
  planName: string;
  amount: number;
  memberCount: number;
  billingCycle: 'monthly' | 'yearly';
  proRateDetails?: {
    is_member_upgrade: boolean;
    previous_member_count: number;
    member_difference: number;
    remaining_days: number;
    prorate_amount: number;
    prorate_percentage: number;
  };
}

export interface UseMidtransPaymentOptions {
  onPaymentClose?: (path: string) => void;
  /** Called when payment succeeds or becomes pending (e.g. to invalidate payment list queries). */
  onPaymentStatusChange?: () => void;
}

export const useMidtransPayment = (options?: UseMidtransPaymentOptions) => {
  const { t } = useAppTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const onPaymentClose = options?.onPaymentClose;
  const onPaymentStatusChange = options?.onPaymentStatusChange;

  const initiateMidtransPayment = async (params: PaymentParams) => {
    if (isLoading || isPopupOpen) {
      return;
    }

    setIsLoading(true);
    setIsPopupOpen(true);
    
    try {
      // Load Midtrans Snap script if not already loaded
      if (!window.snap) {
        await loadMidtransScript();
      }

      // Get auth session for direct fetch call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/create-midtrans-payment`;
      
      const rawResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify(params)
      });

      if (!rawResponse.ok) {
        // Read error response body
        let errorDetails = 'Unknown error';
        try {
          const errorBody = await rawResponse.json();
          if (errorBody.error) errorDetails = errorBody.error;
          if (errorBody.message) errorDetails += `\n${errorBody.message}`;
          if (errorBody.details) {
            errorDetails += `\n\nStack trace:\n${errorBody.details}`;
          }
        } catch {
          try {
            const errorText = await rawResponse.text();
            errorDetails = errorText;
          } catch {
            // Use default errorDetails
          }
        }

        throw new Error(`Edge Function failed (${rawResponse.status}): ${errorDetails}`);
      }

      const data = await rawResponse.json();

      if (!data || !data.token) {
        throw new Error('No payment token received from server');
      }

      // Force close any existing Midtrans elements and reset state
      try {
        // Remove any existing Midtrans iframe or overlay
        const existingOverlays = document.querySelectorAll('[id*="snap"], [class*="snap"], .midtrans-overlay, .snap-overlay, iframe[src*="midtrans"]');
        existingOverlays.forEach(element => {
          element.remove();
        });
        
        // Reset any global Midtrans state if possible
        if (window.snap && window.snap.hide) {
          window.snap.hide();
        }
        
        // Force cleanup of any existing state
        if (window.snap) {
          delete (window.snap as any)._current_popup;
          delete (window.snap as any)._state;
        }
      } catch {
        // Cleanup attempt completed
      }

      // Delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const successPath = '/subscription/overview';
      const fallbackPath = '/subscription/plans';

      // Check real status from Midtrans API when user returns - more reliable than webhook
      const checkPaymentStatusFromMidtrans = async (orderId: string) => {
        try {
          const { data, error } = await supabase.functions.invoke('check-midtrans-payment-status', {
            body: { order_id: orderId }
          });
          if (!error && data?.success) {
            return data.status;
          }
        } catch {
          // Fallback to process-midtrans-payment with result from Snap callback
        }
        return null;
      };

      const syncPaymentStatus = async (result: any, statusOverride?: 'success' | 'pending' | 'failed') => {
        try {
          const orderId = result?.order_id || data.order_id;
          // Prefer: query Midtrans API for real status
          const realStatus = await checkPaymentStatusFromMidtrans(orderId);
          if (realStatus) return;

          // Fallback: sync with process-midtrans-payment using Snap callback result
          const payload = {
            order_id: orderId,
            transaction_status: statusOverride || result?.transaction_status || 'pending',
            transaction_id: result?.transaction_id || '',
            fraud_status: result?.fraud_status || 'accept',
            settlement_time: result?.settlement_time || (statusOverride === 'success' ? new Date().toISOString() : null),
            transaction_time: result?.transaction_time || new Date().toISOString(),
            gross_amount: result?.gross_amount || String(params.amount),
            payment_type: result?.payment_type || 'credit_card',
            bank: result?.bank || result?.va_numbers?.[0]?.bank || null,
            approval_code: result?.approval_code || null
          };

          const response = await fetch(`${SUPABASE_URL}/functions/v1/process-midtrans-payment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_PUBLISHABLE_KEY
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            await response.text();
          }
        } catch {
          // Sync failed - non-blocking
        }
      };

      const snapConfig: any = {
        onSuccess: (result: any) => {
          syncPaymentStatus(result, 'success');
          setIsPopupOpen(false);
          onPaymentStatusChange?.();
          toast.success(t('subscription.plans.success.paymentSuccess', 'Payment successful! Your subscription is being activated...'));
          localStorage.setItem('lastOrderId', data.order_id);
          if (onPaymentClose) {
            setTimeout(() => onPaymentClose(successPath), 2000);
          } else {
            setTimeout(() => { window.location.href = `${window.location.origin}${successPath}`; }, 2000);
          }
        },
        onPending: (result: any) => {
          syncPaymentStatus(result, 'pending');
          setIsPopupOpen(false);
          onPaymentStatusChange?.();
          toast.info(t('subscription.plans.info.paymentProcessing', 'Payment is being processed...'));
          localStorage.setItem('lastOrderId', data.order_id);
          if (onPaymentClose) {
            setTimeout(() => onPaymentClose(successPath), 1000);
          } else {
            setTimeout(() => { window.location.href = `${window.location.origin}${successPath}`; }, 1000);
          }
        },
        onError: () => {
          setIsPopupOpen(false);
          toast.error(t('subscription.plans.error.paymentFailed', 'Payment failed. Please try again.'));
          if (onPaymentClose) onPaymentClose(fallbackPath);
          else window.location.href = `${window.location.origin}${fallbackPath}`;
        },
        onClose: () => {
          setIsPopupOpen(false);
          toast.info(t('subscription.plans.info.paymentCancelled', 'Payment cancelled'));
          if (onPaymentClose) onPaymentClose(fallbackPath);
          else window.location.href = `${window.location.origin}${fallbackPath}`;
        }
      };

      // Open Midtrans payment popup with error handling
      try {
        window.snap.pay(data.token, snapConfig);
      } catch (snapError: any) {
        // Ignore postMessage errors in development
        if (snapError.message && !snapError.message.includes('postMessage')) {
          throw snapError;
        }
      }

    } catch (error: any) {
      const errorMessage = error.message || t('subscription.plans.error.paymentStartFailed', 'Failed to start payment');
      
      // Handle specific error cases
      if (errorMessage.includes('temporary error') || errorMessage.includes('network')) {
        toast.error(t('subscription.plans.error.temporaryError', 'Temporary issue occurred. Please try again in a few minutes.'));
      } else if (errorMessage.includes('payment method')) {
        toast.error(t('subscription.plans.error.paymentMethodUnavailable', 'Payment method unavailable. Please select another payment method.'));
      } else {
        toast.error(applyVariables(t('subscription.plans.error.paymentStartFailed', 'Failed to start payment: {{message}}'), { message: errorMessage }));
      }
    } finally {
      setIsLoading(false);
      setIsPopupOpen(false);
    }
  };

  const loadMidtransScript = async (): Promise<void> => {
    if (window.snap) return;

    const { data: keyData, error } = await supabase.functions.invoke('get-midtrans-config');
    if (error) {
      throw new Error('Failed to get Midtrans configuration');
    }
    const clientKey = keyData?.client_key;
    if (!clientKey) {
      throw new Error('Midtrans client key not configured');
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://app.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', clientKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Midtrans script'));
      document.head.appendChild(script);
    });
  };

  const openSnapForPendingOrder = async (orderId: string) => {
    if (isLoading || isPopupOpen) return;

    setIsLoading(true);
    setIsPopupOpen(true);

    try {
      if (!window.snap) {
        await loadMidtransScript();
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const rawResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-midtrans-snap-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!rawResponse.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorBody = await rawResponse.json();
          if (errorBody.message) errorDetails = errorBody.message;
        } catch {
          errorDetails = await rawResponse.text();
        }
        throw new Error(errorDetails);
      }

      const data = await rawResponse.json();
      if (!data?.token) {
        throw new Error('No payment token received');
      }

      try {
        const existingOverlays = document.querySelectorAll('[id*="snap"], [class*="snap"], .midtrans-overlay, .snap-overlay, iframe[src*="midtrans"]');
        existingOverlays.forEach((el) => el.remove());
        if (window.snap?.hide) window.snap.hide();
        if (window.snap) {
          delete (window.snap as any)._current_popup;
          delete (window.snap as any)._state;
        }
      } catch {
        // cleanup
      }
      await new Promise((r) => setTimeout(r, 200));

      const checkPaymentStatusFromMidtrans = async (oid: string) => {
        try {
          const { data: d, error } = await supabase.functions.invoke('check-midtrans-payment-status', { body: { order_id: oid } });
          if (!error && d?.success) return d.status;
        } catch {
          // ignore
        }
        return null;
      };

      const syncPaymentStatus = async (result: any, statusOverride?: 'success' | 'pending' | 'failed') => {
        try {
          const oid = result?.order_id ?? data.order_id;
          await checkPaymentStatusFromMidtrans(oid);
          const payload = {
            order_id: oid,
            transaction_status: statusOverride ?? result?.transaction_status ?? 'pending',
            transaction_id: result?.transaction_id ?? '',
            fraud_status: result?.fraud_status ?? 'accept',
            settlement_time: result?.settlement_time ?? (statusOverride === 'success' ? new Date().toISOString() : null),
            transaction_time: result?.transaction_time ?? new Date().toISOString(),
            gross_amount: result?.gross_amount ?? '',
            payment_type: result?.payment_type ?? 'credit_card',
            bank: result?.bank ?? result?.va_numbers?.[0]?.bank ?? null,
            approval_code: result?.approval_code ?? null,
          };
          await fetch(`${SUPABASE_URL}/functions/v1/process-midtrans-payment`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              apikey: SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // non-blocking
        }
      };

      const successPath = '/subscription/overview';
      const fallbackPath = '/subscription/plans';

      const snapConfig: any = {
        onSuccess: (result: any) => {
          syncPaymentStatus(result, 'success');
          setIsPopupOpen(false);
          onPaymentStatusChange?.();
          toast.success(t('subscription.plans.success.paymentSuccess', 'Payment successful! Your subscription is being activated...'));
          if (onPaymentClose) setTimeout(() => onPaymentClose(successPath), 2000);
          else setTimeout(() => { window.location.href = `${window.location.origin}${successPath}`; }, 2000);
        },
        onPending: (result: any) => {
          syncPaymentStatus(result, 'pending');
          setIsPopupOpen(false);
          onPaymentStatusChange?.();
          toast.info(t('subscription.plans.info.paymentProcessing', 'Payment is being processed...'));
          if (onPaymentClose) setTimeout(() => onPaymentClose(successPath), 1000);
          else setTimeout(() => { window.location.href = `${window.location.origin}${successPath}`; }, 1000);
        },
        onError: () => {
          setIsPopupOpen(false);
          toast.error(t('subscription.plans.error.paymentFailed', 'Payment failed. Please try again.'));
          if (onPaymentClose) onPaymentClose(fallbackPath);
          else window.location.href = `${window.location.origin}${fallbackPath}`;
        },
        onClose: () => {
          setIsPopupOpen(false);
          toast.info(t('subscription.plans.info.paymentCancelled', 'Payment cancelled'));
          if (onPaymentClose) onPaymentClose(fallbackPath);
          else window.location.href = `${window.location.origin}${fallbackPath}`;
        },
      };

      try {
        window.snap.pay(data.token, snapConfig);
      } catch (snapError: any) {
        if (snapError?.message && !snapError.message.includes('postMessage')) {
          throw snapError;
        }
      }
    } catch (error: any) {
      const msg = error?.message ?? t('subscription.plans.error.paymentStartFailed', 'Failed to start payment');
      toast.error(applyVariables(t('subscription.plans.error.paymentStartFailed', 'Failed to start payment: {{message}}'), { message: msg }));
    } finally {
      setIsLoading(false);
      setIsPopupOpen(false);
    }
  };

  return {
    initiateMidtransPayment,
    openSnapForPendingOrder,
    isLoading,
  };
};


