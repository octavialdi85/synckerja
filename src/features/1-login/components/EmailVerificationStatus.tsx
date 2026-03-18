import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AuthTestimonialsPanel } from '@/features/1-login/AuthTestimonialsPanel';

interface EmailVerificationStatusProps {
  token?: string;
}

// Polling function to confirm email verification in database
const pollEmailVerification = async (token: string, userId: string, maxAttempts = 20, interval = 500): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);
    
    // Check if email_verified is now TRUE in database
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('email_verified')
      .eq('token', token)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, interval));
      continue;
    }
    
    if (data?.email_verified === true) {
      console.log(`✅ Verification confirmed after ${attempt} attempt(s)`);
      return true;
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.error('❌ Polling timeout after 10 seconds - email_verified did not change to TRUE');
  return false;
};

export const EmailVerificationStatus = ({ token }: EmailVerificationStatusProps) => {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [verificationStatus, setVerificationStatus] = useState<string>('Memverifikasi email...');
  const [showSuccess, setShowSuccess] = useState(false); // Control when to show success page
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setLoading(true);
        
        // If token is provided, verify it and update the email_verification_tokens table
        if (token) {
          console.log('🔍 Starting email verification process...');
          setVerificationStatus('Memeriksa token verifikasi...');

          // First, check if token exists and is not expired in the database
          const { data: tokenData, error: tokenError } = await supabase
            .from('email_verification_tokens')
            .select('expires_at, email_verified, user_id')
            .eq('token', token)
            .maybeSingle();

          if (tokenError || !tokenData) {
            console.error('❌ Token validation failed:', tokenError);
            setError('Token tidak valid');
            return;
          }

          console.log('✅ Token found:', { email_verified: tokenData.email_verified });

          // Check if token is already verified
          if (tokenData.email_verified) {
            console.log('✅ Token already verified');
            setVerified(true);
            await checkOrganizationStatus();
            
            // Wait before showing success page
            await new Promise(resolve => setTimeout(resolve, 500));
            setLoading(false);
            setShowSuccess(true);
            return;
          }

          // Check if token has expired
          const now = new Date();
          const expiresAt = new Date(tokenData.expires_at);
          if (now > expiresAt) {
            console.error('❌ Token expired');
            setError('Token sudah kadaluwarsa. Silakan request link verifikasi baru.');
            return;
          }

          // Update the email_verification_tokens table
          console.log('📝 Updating email verification status...');
          setVerificationStatus('Memperbarui status verifikasi...');
          
          const { error: updateError } = await supabase
            .from('email_verification_tokens')
            .update({ 
              email_verified: true,
              used_at: new Date().toISOString()
            })
            .eq('token', token);

          if (updateError) {
            console.error('❌ Error updating verification status:', updateError);
            setError('Gagal memverifikasi email. Silakan coba lagi.');
            return;
          }

          console.log('✅ Update query executed successfully');

          // CRITICAL: Poll database to confirm email_verified actually changed to TRUE
          console.log('🔄 Polling database to confirm verification...');
          setVerificationStatus('Mengkonfirmasi verifikasi email...');
          
          let isVerified = await pollEmailVerification(token, tokenData.user_id);
          
          // RETRY ONCE if polling fails (prevents double-click issue)
          if (!isVerified) {
            console.log('⚠️ Verification polling timeout, retrying once...');
            setVerificationStatus('Mencoba konfirmasi ulang...');
            
            // Wait 1 second then retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            isVerified = await pollEmailVerification(token, tokenData.user_id, 10, 500);
            
            if (!isVerified) {
              console.error('❌ Verification polling failed after retry');
              setError(
                'Verifikasi email membutuhkan waktu lebih lama dari biasanya. ' +
                'Silakan klik link verifikasi lagi atau refresh halaman ini.'
              );
              return;
            }
          }

          console.log('✅ Email verification confirmed in database');
          
          // Mark as verified but keep loading = true for a moment
          setVerified(true);
          await checkOrganizationStatus();
          
          // Wait a bit before showing success page to ensure all state is settled
          console.log('⏳ Waiting before showing success page...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('✅ Ready to show success page');
          setLoading(false);
          setShowSuccess(true);
        } else {
          // No token provided - check current user verification status
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            setError('Silakan login terlebih dahulu');
            return;
          }

          // Check email verification from email_verification_tokens table
          const { data: verificationToken } = await supabase
            .from('email_verification_tokens')
            .select('email_verified')
            .eq('user_id', user.id)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (verificationToken?.email_verified) {
            setVerified(true);
            await checkOrganizationStatus();
          } else {
            setError('Email belum diverifikasi. Silakan cek email Anda untuk link verifikasi.');
          }
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Terjadi kesalahan saat verifikasi email');
        setLoading(false); // Show error immediately
      }
      // Note: Don't use finally block - we control setLoading manually now
    };

    const checkOrganizationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Clear registration flags
        sessionStorage.removeItem('registrationFlow');
        sessionStorage.removeItem('fromRegistration');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('emailError');
        localStorage.removeItem('pendingEmailVerification');

        // Store flags to indicate email has been verified
        sessionStorage.setItem('emailJustVerified', 'true');
        sessionStorage.setItem('forceRefreshUserData', 'true');
        sessionStorage.setItem('emailVerified', 'true');
        
        // Set verified state to show success message with countdown
        // Don't redirect immediately - let the countdown handle it
        console.log('Email verified successfully, starting countdown...');
      } catch (error) {
        console.error('Error during verification completion:', error);
        // Default to login if check fails after countdown
        // Still show success state - user verified email successfully
      }
    };

    verifyEmail();
  }, [token, navigate]);

  // Countdown timer effect for auto-redirect after verification
  useEffect(() => {
    // Only start countdown when success page is actually shown
    if (!showSuccess || error) {
      // Reset countdown if not showing success or has error
      setCountdown(5);
      return;
    }

    // Reset countdown to 5 when success page shows
    setCountdown(5);
    console.log('✅ Success page shown, starting countdown...');

    // Start countdown when success page is displayed
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to login when countdown reaches 0
          console.log('⏭️ Countdown finished, redirecting to login...');
          navigate("/login", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [showSuccess, error, navigate]);

  const handleNavigateToLogin = () => {
    sessionStorage.setItem('fromEmailVerification', 'true');
    navigate('/login');
  };

  const handleNavigateToVerifyEmail = () => {
    navigate('/verify-email');
  };

  // Loading state with dynamic verification status
  if (loading) {
    return (
      <div className="fixed inset-0 flex overflow-hidden h-[100dvh] max-h-[100dvh]">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-hidden">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Status */}
        <div className="auth-right-panel flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
              <p className="text-muted-foreground">Memverifikasi email Anda</p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <div className="flex flex-col items-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold text-gray-900">{verificationStatus}</h2>
                    <p className="text-sm text-gray-600">Mohon tunggu, proses ini mungkin memakan waktu beberapa detik</p>
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>Memvalidasi token verifikasi</span>
                      </div>
                      {verificationStatus.includes('Memperbarui') && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <span>Mengupdate status di database</span>
                        </div>
                      )}
                      {verificationStatus.includes('Mengkonfirmasi') && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                          <span>Mengkonfirmasi perubahan</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 flex overflow-hidden h-[100dvh] max-h-[100dvh]">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-hidden">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Error */}
        <div className="auth-right-panel flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
              <p className="text-muted-foreground">Gagal memverifikasi email</p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <div className="flex flex-col items-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold text-red-700">Verifikasi Gagal</h2>
                    <p className="text-sm text-gray-600 max-w-md">{error}</p>
                  </div>
                  <div className="w-full space-y-3 pt-4">
                    <Button 
                      onClick={handleNavigateToVerifyEmail}
                      variant="outline"
                      className="w-full"
                    >
                      Coba Lagi
                    </Button>
                    <Button 
                      onClick={handleNavigateToLogin}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Kembali ke Login
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state - only show when showSuccess is true
  if (verified && showSuccess) {
    return (
      <div className="fixed inset-0 flex overflow-hidden h-[100dvh] max-h-[100dvh]">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-hidden">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Success */}
        <div className="auth-right-panel flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Email berhasil diverifikasi</p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <div className="flex flex-col items-center space-y-4 sm:space-y-6 py-4 sm:py-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                  </div>
                  <div className="text-center space-y-3 sm:space-y-4 w-full">
                    <h2 className="text-lg sm:text-xl font-semibold text-green-700 px-2">Email Berhasil Diverifikasi!</h2>
                    <p className="text-xs sm:text-sm text-gray-600 px-4">
                      Akun Anda sudah aktif. Silakan login untuk melanjutkan.
                    </p>
                    {/* Countdown Timer - Simple and Clean */}
                    <div className="flex items-center justify-center gap-2 mt-4 mb-3">
                      <div className="bg-orange-100 border-2 border-orange-400 rounded-lg px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Redirect otomatis dalam <span className="font-bold text-orange-600 text-lg mx-1">{countdown}</span> detik
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full pt-4 sm:pt-6">
                    <Button 
                      onClick={handleNavigateToLogin}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 sm:h-14 text-base sm:text-lg font-semibold"
                    >
                      Lanjut ke Login
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};