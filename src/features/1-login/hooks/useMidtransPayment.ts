
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const initiateMidtransPayment = async (params: PaymentParams) => {
    if (isLoading || isPopupOpen) {
      console.log('Payment already in progress, ignoring request');
      return;
    }

    setIsLoading(true);
    setIsPopupOpen(true);
    
    try {
      // Load Midtrans Snap script if not already loaded
      if (!window.snap) {
        await loadMidtransScript();
      }

      console.log('Creating payment with params:', params);

      // Create payment token via updated edge function with better error handling
      const { data, error } = await supabase.functions.invoke('create-midtrans-payment', {
        body: params
      });

      console.log('📡 Supabase function response:', { data, error });

      if (error) {
        console.error('❌ Payment creation error (Supabase):', error);
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data) {
        console.error('❌ No data received from function');
        throw new Error('No response data from payment function');
      }

      if (data.error) {
        console.error('❌ Payment function returned error:', data);
        throw new Error(data.message || data.error || 'Payment function error');
      }

      if (!data.token) {
        console.error('❌ No payment token received:', data);
        throw new Error('No payment token received from server');
      }

      console.log('Payment token received:', data.token);
      console.log('Order ID:', data.order_id);

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
      } catch (e) {
        console.log('Cleanup attempt completed');
      }

      // Delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const appOrigin = window.location.origin;
      const successRedirectUrl = `${appOrigin}/subscription/overview`;
      const fallbackRedirectUrl = `${appOrigin}/subscription/plans`;

      // Open Midtrans payment popup
      const snapConfig: any = {
        onSuccess: (result) => {
          console.log('Payment success:', result);
          setIsPopupOpen(false);
          toast.success('Pembayaran berhasil! Subscription Anda sedang diaktifkan...');
          
          // Store order ID for potential troubleshooting
          localStorage.setItem('lastOrderId', data.order_id);
          
          // Invalidate subscription expiry cache to refresh status immediately
          // This will be handled by the query client invalidation after page reload
          // The subscription_expiry query will auto-refetch on next check
          
          // Refresh subscription data and redirect to subscription page
          setTimeout(() => {
            window.location.href = successRedirectUrl;
          }, 2000);
        },
        onPending: (result) => {
          console.log('Payment pending:', result);
          setIsPopupOpen(false);
          toast.info('Pembayaran sedang diproses...');
          
          // Store order ID for potential troubleshooting
          localStorage.setItem('lastOrderId', data.order_id);
          
          // Redirect to overview page
          setTimeout(() => {
            window.location.href = successRedirectUrl;
          }, 1000);
        },
        onError: (result) => {
          console.error('Payment error:', result);
          setIsPopupOpen(false);
          toast.error('Pembayaran gagal. Silakan gunakan metode pembayaran yang berbeda atau coba lagi nanti.');
          window.location.href = fallbackRedirectUrl;
        },
        onClose: () => {
          console.log('Payment popup closed');
          setIsPopupOpen(false);
          toast.info('Pembayaran dibatalkan');
          window.location.href = fallbackRedirectUrl;
        }
      };

      window.snap.pay(data.token, snapConfig);

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      const errorMessage = error.message || 'Gagal memulai pembayaran';
      
      // Handle specific error cases
      if (errorMessage.includes('temporary error') || errorMessage.includes('network')) {
        toast.error('Terjadi gangguan sementara. Silakan coba lagi dalam beberapa menit.');
      } else if (errorMessage.includes('payment method')) {
        toast.error('Metode pembayaran tidak tersedia. Silakan pilih metode pembayaran lain.');
      } else {
        toast.error('Pembayaran tidak dapat diproses. Silakan hubungi customer service untuk bantuan.');
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
          console.error('Failed to get Midtrans config:', error);
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
          console.log('Midtrans script loaded successfully');
          resolve();
        };
        script.onerror = (error) => {
          console.error('Failed to load Midtrans script:', error);
          reject(new Error('Failed to load Midtrans script'));
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error in loadMidtransScript:', error);
        reject(error);
      }
    });
  };

  return {
    initiateMidtransPayment,
    isLoading
  };
};


