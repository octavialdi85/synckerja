
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/features/ui/use-toast";
let confetti: any; try { confetti = require("canvas-confetti"); } catch {}

const VerifyEmailSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const token = searchParams.get("token");
  const verified = searchParams.get("verified") === "true";

  console.log('VerifyEmailSuccess component loaded with params:', { token, verified });

  useEffect(() => {
    if (!token) {
      console.log('No token provided in URL params');
      setVerificationError("Token verifikasi tidak ditemukan");
      setIsVerifying(false);
      return;
    }

    // If already verified by edge function, skip verification
    if (verified) {
      console.log('Token already verified by edge function');
      setVerificationSuccess(true);
      setIsVerifying(false);
      triggerConfetti();
      return;
    }

    // If token exists but not verified, proceed with verification
    verifyEmailToken();
  }, [token, verified]);

  const verifyEmailToken = async () => {
    try {
      setIsVerifying(true);
      console.log('Starting token verification for token:', token);

      // Check if token is valid and not expired - use select() instead of single()
      const { data: tokenData, error: tokenError }: any = await (supabase as any)
        .from('email_verification_tokens')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());

      console.log('Token validation result:', { tokenData, tokenError });

      if (tokenError) {
        console.error('Token validation error:', tokenError);
        setVerificationError("Terjadi kesalahan saat memvalidasi token");
        return;
      }

      if (!tokenData || tokenData.length === 0) {
        console.log('Token not found, checking if expired or used');
        
        // Check if token exists but is expired or used
        const { data: expiredToken, error: expiredError }: any = await (supabase as any)
          .from('email_verification_tokens')
          .select('*')
          .eq('token', token);

        if (!expiredError && expiredToken && expiredToken.length > 0) {
          const existingToken = expiredToken[0];
          if (existingToken.used_at) {
            console.log('Token already used');
            setVerificationError("Token sudah pernah digunakan");
          } else {
            console.log('Token expired');
            setVerificationError("Token sudah kadaluwarsa. Email verifikasi baru telah dikirim.");
          }
        } else {
          console.log('Token not found in database');
          setVerificationError("Token verifikasi tidak valid");
        }
        return;
      }

      const validToken = tokenData[0];
      console.log('Valid token found, proceeding with verification');

      // Mark token as used
      const { error: updateTokenError }: any = await (supabase as any)
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString(), email_verified: true })
        .eq('id', validToken.id);

      if (updateTokenError) {
        console.error('Update token error:', updateTokenError);
        throw updateTokenError;
      }

      // Email verification is now tracked via used_at field in email_verification_tokens table
      // No need to update profiles table anymore

      console.log('Email verification completed successfully');
      setVerificationSuccess(true);
      triggerConfetti();

    } catch (error) {
      console.error("Verification error:", error);
      setVerificationError("Terjadi kesalahan saat verifikasi email");
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  };

  const handleContinueToLogin = () => {
    navigate("/login");
  };

  const handleResendVerification = async () => {
    try {
      console.log('Attempting to resend verification for token:', token);
      
      // Get token data to resend verification - use select() instead of single()
      const { data: tokenData, error: tokenError }: any = await (supabase as any)
        .from('email_verification_tokens')
        .select('email, user_id')
        .eq('token', token);

      if (!tokenError && tokenData && tokenData.length > 0) {
        const tokenInfo = tokenData[0];
        console.log('Found token info for resend:', tokenInfo.email);
        
        const { error } = await supabase.functions.invoke('send-verification-email', {
          body: {
            email: tokenInfo.email,
            user_id: tokenInfo.user_id,
            type: 'resend'
          }
        });

        if (error) {
          console.error('Resend function error:', error);
          throw error;
        }

        console.log('Resend successful');
        toast({
          title: "Email Dikirim Ulang",
          description: "Email verifikasi baru telah dikirim",
          className: "bg-success text-success-foreground"
        });
      } else {
        console.error('Token not found for resend');
        throw new Error('Token tidak ditemukan');
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Gagal Mengirim Ulang",
        description: "Terjadi kesalahan saat mengirim ulang email",
        variant: "destructive"
      });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border shadow-card">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Memverifikasi Email...
            </h2>
            <p className="text-muted-foreground">
              Mohon tunggu sebentar
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-card border-border shadow-card">
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-foreground mb-2">
              Verifikasi Gagal
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              {verificationError}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {verificationError.includes("kadaluwarsa") ? (
                <Button 
                  onClick={handleResendVerification}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg"
                >
                  Kirim Ulang Email Verifikasi
                </Button>
              ) : null}
              
              <Button 
                onClick={handleContinueToLogin}
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent h-12 text-lg"
              >
                Kembali ke Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-card border-border shadow-card">
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <CardTitle className="text-3xl text-foreground mb-2">
              🎉 Selamat!
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              Email Anda berhasil diverifikasi
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-success/5 border border-success/20 rounded-lg p-6 text-center">
              <h3 className="text-success font-semibold text-lg mb-2">
                ✅ Verifikasi Berhasil
              </h3>
              <p className="text-success/80">
                Akun Anda telah aktif dan siap digunakan. Sekarang Anda dapat masuk ke aplikasi ProfitLoop dengan akun yang telah terverifikasi.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleContinueToLogin}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg"
              >
                Masuk ke Aplikasi
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Terima kasih telah bergabung dengan ProfitLoop! 🚀
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-card">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailSuccess;
