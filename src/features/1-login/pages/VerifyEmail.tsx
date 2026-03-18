import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { toast } from "@/features/1-login/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";

const VerifyEmail = () => {
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Refs untuk cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Helper function untuk clear registration flags
  const clearRegistrationFlags = useCallback(() => {
    sessionStorage.removeItem('registrationFlow');
    sessionStorage.removeItem('fromRegistration');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('emailError');
    localStorage.removeItem('pendingEmailVerification');
  }, []);

  // Helper function untuk handle redirect setelah verifikasi berhasil
  const handleVerificationSuccess = useCallback(() => {
    clearRegistrationFlags();
    
    // Set flag to indicate email has been verified
    sessionStorage.setItem('emailJustVerified', 'true');
    sessionStorage.setItem('forceRefreshUserData', 'true');
    sessionStorage.setItem('emailVerified', 'true');
    
    // Redirect to login
    navigate("/login", { replace: true });
  }, [clearRegistrationFlags, navigate]);

  // Check if user has valid access to this page
  const checkValidAccess = useCallback(async () => {
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
  }, []);

  // Optimized function untuk check verification status
  const checkVerificationStatus = useCallback(async (userIdToCheck: string | null = null) => {
    if (!isMountedRef.current) return false;

    try {
      setIsCheckingVerification(true);
      
      const targetUserId = userIdToCheck || userId || sessionStorage.getItem('pendingUserId');
      
      if (!targetUserId) {
        // Try to get from session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const checkUserId = session.user.id;
          
          // Check email verification status
          const { data: verificationToken, error } = await supabase
            .from('email_verification_tokens')
            .select('email_verified')
            .eq('user_id', checkUserId)
            .eq('email_verified', true)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (error) {
            console.error('Error checking verification:', error);
            return false;
          }
          
          if (verificationToken?.email_verified) {
            handleVerificationSuccess();
            return true;
          }
        }
        return false;
      }

      // Check email verification status dengan user ID
      const { data: verificationToken, error } = await supabase
        .from('email_verification_tokens')
        .select('email_verified')
        .eq('user_id', targetUserId)
        .eq('email_verified', true)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking verification:', error);
        return false;
      }

      if (verificationToken?.email_verified) {
        handleVerificationSuccess();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsCheckingVerification(false);
      }
    }
  }, [userId, handleVerificationSuccess]);

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

  // Fungsi untuk kirim ulang email verifikasi dengan rate limiting
  const resendVerificationEmail = useCallback(async () => {
    // Check cooldown
    if (resendCooldown > 0) {
      toast({
        title: "Mohon tunggu",
        description: `Silakan tunggu ${resendCooldown} detik sebelum mengirim ulang email.`,
      });
      return;
    }

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

      // Set cooldown period (60 seconds)
      setResendCooldown(60);
      
      // Start cooldown timer
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
      
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error resending email:", err);
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim ulang email.";
      setEmailError(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  }, [userEmail, userName, resendCooldown]);

  // Cleanup function
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Clear cooldown interval
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Check access on mount
    const performAccessCheck = async () => {
      // Do NOT force sign-out here to avoid breaking ongoing flows
      const hasValidAccess = await checkValidAccess();
      if (!hasValidAccess || !isMountedRef.current) {
        console.log("Invalid access to verify-email page, redirecting to login");
        navigate("/login");
        return;
      }
      
      // Continue with initialization only if access is valid
      initializePage();
    };

    const initializePage = async () => {
      if (!isMountedRef.current) return;

      // Get stored data
      const storedEmail = sessionStorage.getItem('userEmail');
      const storedName = sessionStorage.getItem('userName');
      const storedEmailError = sessionStorage.getItem('emailError');
      const fromRegistration = sessionStorage.getItem('fromRegistration');
      const pendingUserId = sessionStorage.getItem('pendingUserId');
      
      if (storedEmail) setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      if (pendingUserId) setUserId(pendingUserId);
      
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

      // Initial check if email is already verified
      const isVerified = await checkVerificationStatus(pendingUserId);
      
      if (isVerified || !isMountedRef.current) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false);

      // Start auto-polling untuk check verification status setiap 5 detik
      // Hanya jika belum verified
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        const verified = await checkVerificationStatus(pendingUserId);
        if (verified) {
          // Stop polling if verified
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 5000); // Poll every 5 seconds
    };

    // Start the access check
    performAccessCheck();

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [navigate, checkValidAccess, checkVerificationStatus]);

  // Show loading while checking access
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex overflow-hidden h-[100dvh] max-h-[100dvh]">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-hidden">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Loading */}
        <div className="auth-right-panel flex-1 flex items-center justify-center p-8 min-h-0 overflow-hidden">
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
    <div className="fixed inset-0 flex overflow-hidden h-[100dvh] max-h-[100dvh]">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-hidden">
        <AuthTestimonialsPanel />
      </div>

      {/* Right Panel - Verification Instructions: scroll only inside this panel so page has no vertical scroll */}
      <div className="auth-right-panel flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
            <p className="text-muted-foreground">Periksa email Anda untuk melanjutkan</p>
            <p className="text-xs text-muted-foreground mt-1">Status verifikasi dicek otomatis setiap 5 detik</p>
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
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
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

              {/* Auto-checking indicator */}
              {isCheckingVerification && (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-700">Memeriksa status verifikasi...</p>
                  </div>
                </div>
              )}
          
              {/* Action Buttons */}
              <div className="w-full space-y-3">
                {/* Open Email Button */}
                {userEmail && (
                  <Button
                    className="w-full h-12 font-medium bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={openEmailProvider}
                    disabled={isCheckingVerification}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Buka Email
                  </Button>
                )}
                
                {/* Resend Email Button with Cooldown */}
                <Button
                  variant="outline"
                  className="w-full h-12 font-medium"
                  onClick={resendVerificationEmail}
                  disabled={resendingEmail || resendCooldown > 0 || isCheckingVerification}
                >
                  {resendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Mengirim...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" /> Kirim Ulang ({resendCooldown}s)
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
                    clearRegistrationFlags();
                    navigate("/login");
                  }}
                  disabled={isCheckingVerification}
                >
                  Kembali ke Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
