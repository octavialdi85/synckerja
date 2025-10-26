
import { supabase } from "@/integrations/supabase/client";

export const sendConfirmationEmail = async (
  email: string,
  fullName: string,
  confirmationUrl: string
) => {
  console.log('sendConfirmationEmail: Starting with params:', { email, fullName, confirmationUrl });
  
  try {
    // Use window.location.origin as the base URL - simple and reliable
    const baseUrl = window.location.origin;
    
    console.log('sendConfirmationEmail: Using base URL:', baseUrl);
    
    const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
      body: {
        email: email.trim(),
        fullName: fullName.trim(),
        confirmationUrl: baseUrl
      }
    });

    console.log('sendConfirmationEmail: Response from edge function:', { data, error });

    if (error) {
      console.error('sendConfirmationEmail: Error from edge function:', error);
      throw new Error(error.message || 'Failed to send confirmation email');
    }

    if (!data?.success) {
      console.error('sendConfirmationEmail: Edge function returned failure:', data);
      throw new Error(data?.error || 'Failed to send confirmation email');
    }

    console.log('sendConfirmationEmail: Email sent successfully');
    return data;
  } catch (error) {
    console.error('sendConfirmationEmail: Error:', error);
    throw error;
  }
};
