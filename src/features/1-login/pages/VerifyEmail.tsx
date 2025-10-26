
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { toast } from "@/features/1-login/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, ExternalLink } from "lucide-react";

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
            console.log('Email already verified, checking organization status...');
            
            // Check if user has organization
            const { data: profile } = await supabase
              .from('profiles')
              .select('active_organization_id')
              .eq('user_id', session.user.id)
              .single();
            
            // Clear registration flags
            sessionStorage.removeItem('registrationFlow');
            sessionStorage.removeItem('fromRegistration');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userName');
            sessionStorage.removeItem('emailError');
            localStorage.removeItem('pendingEmailVerification');
            
            // Force refresh user data to update email verification status
            sessionStorage.setItem('forceRefreshUserData', 'true');
            sessionStorage.setItem('emailVerified', 'true');
            
            if (profile && (profile as any).active_organization_id) {
              // User has organization, redirect to welcome page
              console.log('User has organization, redirecting to welcome page');
              toast({
                title: "Email sudah diverifikasi!",
                description: "Selamat datang! Mengarahkan ke halaman utama.",
              });
              
              setTimeout(() => {
                navigate("/employee-welcome", { replace: true });
              }, 100);
            } else {
              // User doesn't have organization, redirect to create organization
              console.log('User has no organization, redirecting to create-organization');
              toast({
                title: "Email sudah diverifikasi!",
                description: "Selamat datang! Silakan lanjutkan setup organisasi Anda.",
              });
              
              setTimeout(() => {
                navigate("/create-organization", { replace: true });
              }, 100);
            }
            return;
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Card className="w-full max-w-md shadow border rounded-2xl bg-white">
        <CardContent className="p-6 flex flex-col items-center">
          {/* Mail Icon */}
          <Mail size={48} className="mb-4 text-blue-500" />
          
          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-3 text-gray-900">
            Periksa Email Anda
          </h2>
          
          {/* Description */}
          <p className="text-center text-gray-600 text-sm mb-4 leading-relaxed">
            Kami telah mengirim email verifikasi dengan link khusus untuk mengaktifkan akun Anda. 
            Klik link di email tersebut untuk melanjutkan.
          </p>

          {/* Email information box - only show if we have email */}
          {userEmail && (
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                <span className="font-medium text-blue-600">Email dikirim ke:</span>{" "}
                <span className="text-blue-800">{userEmail}</span>
              </p>
            </div>
          )}

          {/* Error Display */}
          {emailError && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-700">{emailError}</p>
            </div>
          )}

          {/* Steps info */}
          <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="text-xs text-green-700">
              <p className="font-medium mb-2 text-green-800">Langkah verifikasi:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Buka email dari ProfitLoop</li>
                <li>Klik tombol "Verifikasi Email Saya"</li>
                <li>Anda akan otomatis diarahkan ke halaman konfirmasi</li>
                <li>Kemudian login dengan akun Anda</li>
              </ol>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="w-full space-y-2 mb-4">
            {/* Open Email Button */}
            {userEmail && (
              <Button
                className="w-full rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white"
                onClick={openEmailProvider}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka Email
              </Button>
            )}
            
            {/* Resend Email Button */}
            <Button
              variant="outline"
              className="w-full rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
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
          </div>

          {/* Back to Login Button */}
          <Button
            variant="ghost"
            className="w-full rounded-lg font-medium text-gray-600 hover:bg-gray-50"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
