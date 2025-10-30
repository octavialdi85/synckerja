import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      handleVerification(token);
    }
  }, [searchParams]);

  const handleVerification = async (token: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-token', {
        body: { token }
      });

      if (error) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        setErrorMessage('Token verifikasi tidak valid atau sudah kedaluwarsa');
        toast({
          title: "Verifikasi Gagal",
          description: "Token verifikasi tidak valid atau sudah kedaluwarsa",
          variant: "destructive"
        });
        return;
      }

      if (data?.success) {
        setVerificationStatus('success');
        toast({
          title: "Email Berhasil Diverifikasi",
          description: "Akun Anda telah diverifikasi. Silakan login.",
          className: "bg-success text-success-foreground"
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setErrorMessage(data?.error || 'Terjadi kesalahan saat verifikasi');
        toast({
          title: "Verifikasi Gagal",
          description: data?.error || 'Terjadi kesalahan saat verifikasi',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      setErrorMessage('Terjadi kesalahan jaringan');
      toast({
        title: "Verifikasi Gagal",
        description: "Terjadi kesalahan jaringan",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // If we have a token and are verifying
  if (searchParams.get('token') && (isVerifying || verificationStatus !== 'idle')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isVerifying && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
              {verificationStatus === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
              {verificationStatus === 'error' && <AlertCircle className="h-12 w-12 text-red-500" />}
            </div>
            <CardTitle className="text-xl font-semibold">
              {isVerifying && "Memverifikasi Email..."}
              {verificationStatus === 'success' && "Email Berhasil Diverifikasi!"}
              {verificationStatus === 'error' && "Verifikasi Gagal"}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {isVerifying && (
              <p className="text-muted-foreground">
                Sedang memverifikasi email Anda, harap tunggu...
              </p>
            )}
            
            {verificationStatus === 'success' && (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Pendaftaran Berhasil
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    Email verifikasi telah dikirim ke alamat email Anda
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Email Anda telah berhasil diverifikasi. Anda akan diarahkan ke halaman login dalam beberapa detik.
                </p>
              </>
            )}
            
            {verificationStatus === 'error' && (
              <>
                <p className="text-red-600 dark:text-red-400">
                  {errorMessage}
                </p>
                <p className="text-muted-foreground text-sm">
                  Silakan coba lagi atau hubungi support jika masalah berlanjut.
                </p>
              </>
            )}
            
            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
                disabled={isVerifying}
              >
                {verificationStatus === 'success' ? 'Lanjut ke Login' : 'Kembali ke Login'}
              </Button>
              
              {verificationStatus === 'error' && (
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Coba Lagi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default email check page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Periksa Email Anda
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Kami telah mengirimkan email verifikasi ke alamat email Anda. 
            Silakan periksa inbox dan klik link verifikasi untuk melanjutkan.
          </p>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Tidak menerima email?</p>
            <ul className="space-y-1">
              <li>• Periksa folder spam/junk</li>
              <li>• Pastikan alamat email sudah benar</li>
              <li>• Email mungkin membutuhkan beberapa menit</li>
            </ul>
          </div>
          
          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Kembali ke Login
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Muat Ulang Halaman
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
