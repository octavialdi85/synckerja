import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { toast } from "@/features/1-login/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, ExternalLink } from "lucide-react";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";

const VerifyEmail = () => {
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user has valid access to this page
  const checkValidAccess = async () => {
    const registrationFlow = sessionStorage.getItem('registrationFlow');
    const fromRegistration = sessionStorage.getItem('fromRegistration');
    
    // Allow during registration flow
    if (registrationFlow === 'true' || fromRegistration === 'true') {
      return true;
    }

    const pendingVerification = localStorage.getItem('pendingEmailVerification');
    if (pendingVerification) {
      return true;
    }

    // Check if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Always allow access to authenticated users during email verification process
        // This prevents unwanted redirects after registration
        console.log('Authenticated user accessing verify-email page, allowing access');
        return true;
      }
    } catch (error: any) {
      console.error('Access check error:', error);
      
      // If we get auth errors, it means stale auth state
      if (error?.message?.includes('User from sub claim in JWT does not exist') ||
          error?.status === 403) {
        // Force auth reset and redirect to login
        const { forceAuthReset } = await import('@/features/1-login/utils/authCleanup');
        forceAuthReset();
        return false;
      }
    }

    return false;
  };

  // Function to open email provider
  const openEmailProvider = () => {
    if (!userEmail) return;
    
    const domain = userEmail.split('@')[1];
    let emailUrl = '';

    // Common email providers
    switch (domain) {
      case 'gmail.com':
        emailUrl = 'https://mail.google.com/';
        break;
      case 'yahoo.com':
      case 'yahoo.co.id':
        emailUrl = 'https://mail.yahoo.com/';
        break;
      case 'outlook.com':
      case 'hotmail.com':
      case 'live.com':
        emailUrl = 'https://outlook.live.com/';
        break;
      default:
        // For other providers, try to construct webmail URL
        emailUrl = `https://mail.${domain}/`;
    }

    // Open in new tab
    window.open(emailUrl, '_blank');
  };

  // Fungsi untuk kirim ulang email verifikasi
  const resendVerificationEmail = async () => {
    setResendingEmail(true);
    setEmailError(null);

    try {
      const email = userEmail || sessionStorage.getItem('userEmail') || '';
      const fullName = userName || sessionStorage.getItem('userName') || '';
      
      if (!email || !fullName) {
        setEmailError("Data email atau nama tidak ditemukan. Silakan daftar ulang.");
        setResendingEmail(false);
        return;
      }

      // Import sendConfirmationEmail function
      const { sendConfirmationEmail } = await import("@/features/1-login/utils/emailConfirmation");
      
      await sendConfirmationEmail(email, fullName, window.location.origin);

      toast({
        title: "Email terkirim!",
        description: "Email verifikasi telah dikirim ulang. Silakan cek kotak masuk Anda.",
      });

    } catch (err) {
      console.error("Error resending email:", err);
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim ulang email.";
      setEmailError(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    // Check access on mount
    const performAccessCheck = async () => {
      // Do NOT force sign-out here to avoid breaking ongoing flows
      const hasValidAccess = await checkValidAccess();
      if (!hasValidAccess) {
        console.log("Invalid access to verify-email page, redirecting to login");
        navigate("/login");
        return;
      }
      
      // Continue with initialization only if access is valid
      initializePage();
    };

    const initializePage = async () => {
      // Get stored data
      const storedEmail = sessionStorage.getItem('userEmail');
      const storedName = sessionStorage.getItem('userName');
      const storedEmailError = sessionStorage.getItem('emailError');
      const fromRegistration = sessionStorage.getItem('fromRegistration');
      
      if (storedEmail) setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      if (storedEmailError) {
        setEmailError(storedEmailError);
        // Clear the stored error
        sessionStorage.removeItem('emailError');
      }

      // Show email sent toast if user just completed registration
      if (fromRegistration === 'true') {
        toast({
          title: "Email Berhasil Dikirim!",
          description: "Kami telah mengirim email verifikasi ke alamat email Anda. Silakan cek kotak masuk Anda.",
        });
      }

      // Check if email is already verified
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check email verification status
          const { data: verificationToken } = await supabase
            .from('email_verification_tokens')
            .select('email_verified')
            .eq('user_id', session.user.id)
            .eq('email_verified', true)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (verificationToken && (verificationToken as any).email_verified) {
            console.log('Email already verified, keeping user on verify-email page to read instructions');
            
            // Clear registration flags
            sessionStorage.removeItem('registrationFlow');
            sessionStorage.removeItem('fromRegistration');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userName');
            sessionStorage.removeItem('emailError');
            localStorage.removeItem('pendingEmailVerification');
            
            // Set flag to indicate email has been verified
            sessionStorage.setItem('emailJustVerified', 'true');
            sessionStorage.setItem('forceRefreshUserData', 'true');
            sessionStorage.setItem('emailVerified', 'true');
            
            // DON'T redirect here - let the user click "Back to Login" button
            // The login page will handle the redirect to create-organization based on emailJustVerified flag
          }
        }
      } catch (error) {
        console.error('Error checking email verification status:', error);
      }

      setIsLoading(false);

      // Auth state change listener removed to prevent infinite loop
    };

    // Start the access check
    performAccessCheck();
  }, [navigate]);

  // Show loading while checking access
  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Loading */}
        <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:flex-1">
        <AuthTestimonialsPanel />
      </div>

      {/* Right Panel - Verification Instructions */}
      <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
            <p className="text-muted-foreground">Periksa email Anda untuk melanjutkan</p>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0 flex flex-col items-center">
              {/* Mail Icon */}
              <Mail size={64} className="mb-6 text-orange-500" />

              {/* Email information box - only show if we have email */}
              {userEmail && (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium text-blue-600">Email dikirim ke:</span>{" "}
                    <span className="text-blue-800">{userEmail}</span>
                  </p>
                </div>
              )}

              {/* Error Display */}
              {emailError && (
                <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{emailError}</p>
                </div>
              )}

              {/* Steps info */}
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <div className="text-sm text-green-700">
                  <p className="font-medium mb-2 text-green-800">Langkah verifikasi:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Buka email dari ProfitLoop</li>
                    <li>Klik tombol "Verifikasi Email Saya"</li>
                    <li>Anda akan otomatis diarahkan ke halaman konfirmasi</li>
                    <li>Kemudian login dengan akun Anda</li>
                  </ol>
                </div>
              </div>
          
              {/* Action Buttons */}
              <div className="w-full space-y-3">
                {/* Open Email Button */}
                {userEmail && (
                  <Button
                    className="w-full h-12 font-medium bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={openEmailProvider}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Buka Email
                  </Button>
                )}
                
                {/* Resend Email Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 font-medium"
                  onClick={resendVerificationEmail}
                  disabled={resendingEmail}
                >
                  {resendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" /> Kirim Ulang Email
                    </>
                  )}
                </Button>

                {/* Back to Login Button */}
                <Button
                  variant="ghost"
                  className="w-full h-12 font-medium"
                  onClick={() => {
                    // Clear registration flow flags
                    sessionStorage.removeItem('registrationFlow');
                    sessionStorage.removeItem('fromRegistration');
                    sessionStorage.removeItem('userEmail');
                    sessionStorage.removeItem('userName');
                    sessionStorage.removeItem('emailError');
                    navigate("/login");
                  }}
                >
                  Kembali ke Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
