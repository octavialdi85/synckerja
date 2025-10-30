
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { DesktopWarning } from "@/components/DesktopWarning";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const authSubscriptionRef = useRef<any>(null);

  // Aggressive auth state cleanup
  const aggressiveAuthCleanup = async () => {
    try {
      // Clear all storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });

      // Force sign out
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.log('Cleanup error (expected):', error);
    }
  };

  // Setup auth state monitoring during signup
  useEffect(() => {
    if (isSigningUp) {
      // Monitor auth state changes during signup and force logout
      authSubscriptionRef.current = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session && isSigningUp) {
            console.log('Detected auto-login during signup, forcing logout...');
            // Immediately sign out if user gets auto-logged in during signup
            setTimeout(async () => {
              await aggressiveAuthCleanup();
            }, 100);
          }
        }
      );

      return () => {
        if (authSubscriptionRef.current) {
          authSubscriptionRef.current.data.subscription.unsubscribe();
        }
      };
    }
  }, [isSigningUp]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Password dan konfirmasi password tidak cocok",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error", 
        description: "Password minimal 6 karakter",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsSigningUp(true);

    try {
      // Aggressive cleanup before signup
      await aggressiveAuthCleanup();

      // Sign up without auto-confirmation to prevent auto-login
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          // User exists, check if they're verified
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('email', email.trim())
              .maybeSingle();

            if (profileData) {
              // Check if user has any verified tokens
              const { data: verificationData } = await supabase
                .from('email_verification_tokens')
                .select('used_at')
                .eq('user_id', profileData.user_id)
                .not('used_at', 'is', null)
                .maybeSingle();

              if (!verificationData) {
                // User exists but not verified, resend verification email
                try {
                  const { error } = await supabase.functions.invoke('send-verification-email', {
                    body: {
                      email: email.trim(),
                      user_id: profileData.user_id,
                      type: 'resend',
                      origin: window.location.origin
                    }
                  });

                  if (error) {
                    console.error('Failed to resend verification email:', error);
                  }

                  toast({
                    title: "Email Verifikasi Dikirim Ulang",
                    description: "Email verifikasi baru telah dikirim ke alamat email Anda",
                    className: "bg-success text-success-foreground"
                  });

                  setTimeout(() => {
                    navigate("/verify-email", { 
                      state: { 
                        email: email.trim(),
                        token: profileData.user_id
                      } 
                    });
                  }, 1500);
                  return;
                } catch (resendError) {
                  console.error('Failed to resend verification email:', resendError);
                }
              }
            }

            toast({
              title: "Email Sudah Terdaftar",
              description: "Silakan login dengan email yang sudah terdaftar",
              variant: "destructive"
            });
            setTimeout(() => navigate("/login"), 2000);
          } catch (checkError) {
            console.error('Error checking existing user:', checkError);
            toast({
              title: "Email Sudah Terdaftar",
              description: "Silakan login dengan email yang sudah terdaftar",
              variant: "destructive"
            });
            setTimeout(() => navigate("/login"), 2000);
          }
        } else {
          toast({
            title: "Pendaftaran Gagal",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }

      // Always ensure user is not auto-logged in after signup
      if (data.user) {
      // Create profile record manually to ensure it's created
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            full_name: fullName.trim(),
            email: email.trim()
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail signup if profile creation fails, just log it
        }

        // Send verification email using edge function
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-verification-email', {
            body: {
              email: email.trim(),
              user_id: data.user.id,
              type: 'signup',
              origin: window.location.origin
            }
          });

          if (emailError) {
            console.error('Email sending error:', emailError);
            toast({
              title: "Pendaftaran Berhasil",
              description: "Akun berhasil dibuat, silakan cek email untuk verifikasi.",
              className: "bg-success text-success-foreground"
            });
          } else if (!emailData.success) {
            console.error('Email sending failed:', emailData.error);
            toast({
              title: "Pendaftaran Berhasil",
              description: "Akun berhasil dibuat, silakan cek email untuk verifikasi.",
              className: "bg-success text-success-foreground"
            });
          } else {
            toast({
              title: "Pendaftaran Berhasil",
              description: "Email verifikasi telah dikirim ke alamat email Anda",
              className: "bg-success text-success-foreground"
            });
          }
        } catch (emailError) {
          console.error('Edge function call error:', emailError);
          toast({
            title: "Pendaftaran Berhasil",
            description: "Akun berhasil dibuat, silakan cek email untuk verifikasi.",
            className: "bg-success text-success-foreground"
          });
        }

        // Force one more cleanup after signup to ensure no auto-login
        setTimeout(async () => {
          await aggressiveAuthCleanup();
        }, 500);

        // Navigate to verify email page
        setTimeout(() => {
          setIsSigningUp(false);
          navigate("/verify-email", { 
            state: { 
              email: email.trim(),
              token: data.user.id
            } 
          });
        }, 1500);
      }

    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsSigningUp(false);
    }
  };

  return (
    <DesktopWarning>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">ProfitLoop</CardTitle>
            <p className="text-muted-foreground text-center">
              Buat akun baru Anda
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="fullName" 
                    type="text" 
                    placeholder="Masukkan nama lengkap" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    disabled={isLoading} 
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nama@perusahaan.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    disabled={isLoading} 
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    disabled={isLoading} 
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    disabled={isLoading} 
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  "Daftar"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:text-primary-glow underline-offset-4 hover:underline">
                  Sudah punya akun? Masuk di sini
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DesktopWarning>
  );
};

export default Signup;
