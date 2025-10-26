import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EmailVerificationStatusProps {
  token?: string;
}

export const EmailVerificationStatus = ({ token }: EmailVerificationStatusProps) => {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setLoading(true);
        
        // If token is provided, verify it
        if (token) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });
          
          if (error) {
            setError(error.message);
          } else {
            setVerified(true);
          }
        } else {
          // Check current user verification status
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user?.email_confirmed_at) {
            setVerified(true);
          } else {
            setError('Email belum diverifikasi');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat verifikasi email');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleNavigateToLogin = () => {
    sessionStorage.setItem('fromEmailVerification', 'true');
    navigate('/login');
  };

  const handleNavigateToVerifyEmail = () => {
    navigate('/verify-email');
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-lg font-semibold mb-2">Memverifikasi Email...</h2>
          <p className="text-muted-foreground">Mohon tunggu sebentar</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-semibold mb-2 text-red-700">Verifikasi Gagal</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-y-2">
            <Button 
              onClick={handleNavigateToVerifyEmail}
              className="w-full"
              variant="outline"
            >
              Coba Lagi
            </Button>
            <Button 
              onClick={handleNavigateToLogin}
              className="w-full"
            >
              Kembali ke Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-500" />
          <h2 className="text-lg font-semibold mb-2 text-green-700">Email Berhasil Diverifikasi!</h2>
          <p className="text-muted-foreground mb-4">
            Akun Anda sudah aktif. Silakan login untuk melanjutkan.
          </p>
          <Button 
            onClick={handleNavigateToLogin}
            className="w-full"
          >
            Lanjut ke Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};