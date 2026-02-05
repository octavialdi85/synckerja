
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

export const useMidtransPayment = () => {
  const { t } = useAppTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

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

      // Configure Snap with proper error handling for localhost
      const appOrigin = window.location.origin;
      const successRedirectUrl = `${appOrigin}/subscription/overview`;
      const fallbackRedirectUrl = `${appOrigin}/subscription/plans`;

      const syncPaymentStatus = async (result: any, statusOverride?: 'success' | 'pending' | 'failed') => {
        try {
          const payload = {
            order_id: result?.order_id || data.order_id,
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
          toast.success(t('subscription.plans.success.paymentSuccess', 'Payment successful! Your subscription is being activated...'));
          
          localStorage.setItem('lastOrderId', data.order_id);
          
          setTimeout(() => {
            window.location.href = successRedirectUrl;
          }, 2000);
        },
        onPending: (result: any) => {
          syncPaymentStatus(result, 'pending');
          setIsPopupOpen(false);
          toast.info(t('subscription.plans.info.paymentProcessing', 'Payment is being processed...'));
          
          localStorage.setItem('lastOrderId', data.order_id);
          
          setTimeout(() => {
            window.location.href = successRedirectUrl;
          }, 1000);
        },
        onError: () => {
          setIsPopupOpen(false);
          toast.error(t('subscription.plans.error.paymentFailed', 'Payment failed. Please try again.'));
          window.location.href = fallbackRedirectUrl;
        },
        onClose: () => {
          setIsPopupOpen(false);
          toast.info(t('subscription.plans.info.paymentCancelled', 'Payment cancelled'));
          window.location.href = fallbackRedirectUrl;
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

  const loadMidtransScript = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (window.snap) {
        resolve();
        return;
      }

      try {
        // Get client key from edge function
        const { data: keyData, error } = await supabase.functions.invoke('get-midtrans-config');
        
        if (error) {
          reject(new Error('Failed to get Midtrans configuration'));
          return;
        }

        const clientKey = keyData?.client_key;
        
        if (!clientKey) {
          reject(new Error('Midtrans client key not configured'));
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://app.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', clientKey);
        script.onload = () => {
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Midtrans script'));
        };
        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  };

  return {
    initiateMidtransPayment,
    isLoading
  };
};


