
import { useState } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
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

      // Get auth session for direct fetch call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Direct fetch to Edge Function to capture error details
      console.log('🚀 Calling Edge Function directly with fetch...');
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

      console.log('📡 Raw response status:', rawResponse.status);

      if (!rawResponse.ok) {
        // Read error response body
        let errorDetails = 'Unknown error';
        try {
          const errorBody = await rawResponse.json();
          console.error('📦 Error response body:', errorBody);
          
          if (errorBody.error) errorDetails = errorBody.error;
          if (errorBody.message) errorDetails += `\n${errorBody.message}`;
          if (errorBody.details) {
            console.error('📦 Error stack trace:', errorBody.details);
            errorDetails += `\n\nStack trace:\n${errorBody.details}`;
          }
        } catch (jsonError) {
          // Try as text
          try {
            const errorText = await rawResponse.text();
            console.error('📦 Error response text:', errorText);
            errorDetails = errorText;
          } catch (textError) {
            console.error('❌ Failed to read error response');
          }
        }
        
        console.error('🚨 DETAILED ERROR FROM EDGE FUNCTION:', errorDetails);
        throw new Error(`Edge Function failed (${rawResponse.status}): ${errorDetails}`);
      }

      // Parse successful response
      const data = await rawResponse.json();
      console.log('✅ Payment response data:', data);
      
      // ENHANCED DEBUG: Log Midtrans response details
      console.log('=== FRONTEND MIDTRANS RESPONSE DEBUG ===');
      console.log('Full response object:', JSON.stringify(data, null, 2));
      
      if (data.debug_info) {
        console.log('📋 Requested payments:', data.debug_info.requested_payments);
        console.log('📋 Midtrans full response:', JSON.stringify(data.debug_info.midtrans_response, null, 2));
        
        if (data.debug_info.midtrans_response.enabled_payments) {
          console.log('✅ Enabled payments from Midtrans:', data.debug_info.midtrans_response.enabled_payments);
        }
        
        if (data.debug_info.midtrans_response.available_payment_methods) {
          console.log('✅ Available payment methods:', data.debug_info.midtrans_response.available_payment_methods);
        }
      }

      // Validate response data
      if (!data || !data.token) {
        console.error('❌ Invalid response data:', data);
        throw new Error('No payment token received from server');
      }

      console.log('✅ Payment token:', data.token);
      console.log('✅ Order ID:', data.order_id);

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

      // Configure Snap with proper error handling for localhost
      const snapConfig: any = {
        onSuccess: (result: any) => {
          console.log('✅ Payment success:', result);[
  {
    "boot_time": null,
    "cpu_time_used": null,
    "deployment_id": "najgdwffjhnqlogfrlqa_cdc583e7-b538-4297-8e61-be0bf949b28e_139",
    "event_type": "Log",
    "execution_id": "34502baa-b839-4a57-af01-8fbeeec2771b",
    "function_id": "cdc583e7-b538-4297-8e61-be0bf949b28e",
    "level": "info",
    "memory_used": [],
    "project_ref": "najgdwffjhnqlogfrlqa",
    "reason": null,
    "region": "ap-southeast-1",
    "served_by": "supabase-edge-runtime-1.69.4 (compatible with Deno v2.1.4)",
    "timestamp": "2025-10-26T01:40:31.419Z",
    "version": "139"
  }
]
          setIsPopupOpen(false);
          toast.success('Pembayaran berhasil! Subscription Anda sedang diaktifkan...');
          
          localStorage.setItem('lastOrderId', data.order_id);
          
          setTimeout(() => {
            window.location.href = '/subscription/overview';
          }, 2000);
        },
        onPending: (result: any) => {
          console.log('⏳ Payment pending:', result);
          setIsPopupOpen(false);
          toast.info('Pembayaran sedang diproses...');
          
          localStorage.setItem('lastOrderId', data.order_id);
          
          setTimeout(() => {
            window.location.href = '/subscription/overview';
          }, 1000);
        },
        onError: (result: any) => {
          console.error('❌ Payment error:', result);
          setIsPopupOpen(false);
          toast.error('Pembayaran gagal. Silakan coba lagi.');
        },
        onClose: () => {
          console.log('🔒 Payment popup closed');
          setIsPopupOpen(false);
          toast.info('Pembayaran dibatalkan');
        }
      };

      // Open Midtrans payment popup with error handling
      try {
        window.snap.pay(data.token, snapConfig);
      } catch (snapError: any) {
        console.error('❌ Snap.pay error:', snapError);
        // Ignore postMessage errors in development
        if (snapError.message && !snapError.message.includes('postMessage')) {
          throw snapError;
        }
      }

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


