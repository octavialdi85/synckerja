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
  const [countdown, setCountdown] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
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
        
        // Check if user has organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        // For new users without organization, always redirect to /login
        // Login page will then redirect to /create-organization
        console.log('Email verified successfully, redirecting to login in 5 seconds...');
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 5000);
      } catch (error) {
        console.error('Error checking organization status:', error);
        // Default to login if check fails
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 5000);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  // Start a visible countdown once verified, to match the 5s redirect
  useEffect(() => {
    if (!verified) return;
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verified]);

  // Fallback: ensure redirect when countdown hits 0
  useEffect(() => {
    if (verified && countdown === 0 && !hasRedirected) {
      setHasRedirected(true);
      navigate('/login', { replace: true });
    }
  }, [verified, countdown, hasRedirected, navigate]);

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
        <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifikasi Email</h1>
              <p className="text-muted-foreground">Email berhasil diverifikasi</p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <div className="flex flex-col items-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold text-green-700">Email Berhasil Diverifikasi!</h2>
                    <p className="text-sm text-gray-600">
                      Akun Anda sudah aktif. Silakan login untuk melanjutkan.
                    </p>
                  </div>
                  <div className="w-full pt-4">
                    <Button 
                      onClick={handleNavigateToLogin}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12"
                    >
                      Lanjut ke Login
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mengarahkan ke halaman login dalam {countdown}s...
                  </p>
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