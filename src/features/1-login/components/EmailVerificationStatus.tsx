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

export const EmailVerificationStatus = ({ token }: EmailVerificationStatusProps) => {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setLoading(true);
        
        // If token is provided, verify it and update the email_verification_tokens table
        if (token) {
          // First, check if token exists and is not expired in the database
          const { data: tokenData, error: tokenError } = await supabase
            .from('email_verification_tokens')
            .select('expires_at, email_verified')
            .eq('token', token)
            .maybeSingle();

          if (tokenError || !tokenData) {
            setError('Token tidak valid');
            return;
          }

          // Check if token is already verified
          if (tokenData.email_verified) {
            setVerified(true);
            await checkOrganizationStatus();
            return;
          }

          // Check if token has expired
          const now = new Date();
          const expiresAt = new Date(tokenData.expires_at);
          if (now > expiresAt) {
            setError('Token sudah kadaluwarsa. Silakan request link verifikasi baru.');
            return;
          }

          // Update the email_verification_tokens table directly without using Supabase auth verifyOtp
          // because we're using a custom token from the database, not Supabase's OTP system
          const { data: tokenRecord, error: updateError } = await supabase
            .from('email_verification_tokens')
            .update({ 
              email_verified: true,
              used_at: new Date().toISOString()
            })
            .eq('token', token)
            .select('user_id')
            .single();

          if (updateError) {
            console.error('Error updating verification status:', updateError);
            setError('Gagal memverifikasi email. Silakan coba lagi.');
            return;
          }

          if (tokenRecord?.user_id) {
            console.log('Email verification successful for user:', tokenRecord.user_id);
            setVerified(true);
            // After successful verification, check organization status
            await checkOrganizationStatus();
          }
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
      } finally {
        setLoading(false);
      }
    };

    const checkOrganizationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Keep loading state while redirecting
        setLoading(true);

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
        setVerified(true); // Still show success state
      }
    };

    verifyEmail();
  }, [token, navigate]);

  // Countdown timer effect for auto-redirect after verification
  useEffect(() => {
    if (!verified || error) {
      // Reset countdown if not verified or has error
      setCountdown(5);
      return;
    }

    // Reset countdown to 5 when verified becomes true
    setCountdown(5);

    // Start countdown when verified
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to login when countdown reaches 0
          console.log('Countdown finished, redirecting to login...');
          navigate("/login", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [verified, error, navigate]);

  const handleNavigateToLogin = () => {
    sessionStorage.setItem('fromEmailVerification', 'true');
    navigate('/login');
  };

  const handleNavigateToVerifyEmail = () => {
    navigate('/verify-email');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Status */}
        <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
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
                    <h2 className="text-xl font-semibold text-gray-900">Memverifikasi Email...</h2>
                    <p className="text-sm text-gray-600">Mohon tunggu sebentar</p>
                    {verified && (
                      <p className="text-xs text-green-600 mt-2">✓ Email berhasil diverifikasi, mengarahkan ke login...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Error */}
        <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
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
    );
  }

  // Success state
  if (verified) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel - Testimonials */}
        <div className="hidden lg:flex lg:flex-1">
          <AuthTestimonialsPanel />
        </div>

        {/* Right Panel - Verification Success */}
        <div className="auth-right-panel flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
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
                      Akun Anda sudah aktif. Anda akan diarahkan ke halaman login dalam:
                    </p>
                    {/* Countdown Timer - Enhanced for Mobile Visibility */}
                    <div className="flex items-center justify-center mt-4 sm:mt-6 mb-3 sm:mb-4">
                      <div className="bg-orange-50 border-4 border-orange-300 rounded-full w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center shadow-xl animate-pulse">
                        <span className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-orange-600">{countdown}</span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 mt-2 sm:mt-3 px-4 font-semibold">
                      {countdown > 0 ? `Mengarahkan ke login dalam ${countdown} ${countdown === 1 ? 'detik' : 'detik'}...` : 'Mengarahkan ke login...'}
                    </p>
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
    );
  }

  return null;
};