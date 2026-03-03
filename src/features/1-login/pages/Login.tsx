import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Input } from "@/features/ui/input";
import { Button } from "@/features/ui/button";
import { Label } from "@/features/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show message when redirected due to session/refresh token error (500/504)
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      toast({
        title: "Sesi berakhir",
        description: "Sesi habis atau server sibuk. Silakan masuk kembali.",
        variant: "default",
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Check if user is coming from email verification
  useEffect(() => {
    const checkEmailVerificationStatus = async () => {
      setCheckingAuth(true);
      try {
        // CRITICAL: Check if user is in registration flow - prevent redirect to /login
        const registrationFlow = sessionStorage.getItem('registrationFlow');
        const fromRegistration = sessionStorage.getItem('fromRegistration');
        if (registrationFlow === 'true' || fromRegistration === 'true') {
          // User is in registration flow, redirect to verify-email instead
          console.log('Login: User in registration flow, redirecting to verify-email...');
          navigate("/verify-email", { replace: true });
          return;
        }
        
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // If user has a session, redirect to home
          // Don't auto-redirect to /create-organization here - let user login first
          console.log('Login: User already authenticated, redirecting to home...');
          navigate("/", { replace: true });
          return;
        }
        
        // Handle toast for email verification
        const fromEmailVerification = sessionStorage.getItem('fromEmailVerification');
        if (fromEmailVerification === 'true') {
          toast({
            title: "Email Berhasil Diverifikasi",
            description: "Silakan login untuk melanjutkan pembuatan organisasi."
          });
          sessionStorage.removeItem('fromEmailVerification');
        }
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkEmailVerificationStatus();
  }, [navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log('Login: Attempting login for:', email);

      // Login dengan Supabase
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        console.log('Login: Authentication error:', error.message);
        // Handle timeout/network/abort/504 errors (Supabase "context deadline exceeded")
        const isTimeoutOrNetwork = error.message?.includes('timeout') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('signal is aborted') ||
          error.message?.includes('504') ||
          error.message?.includes('Gateway Timeout') ||
          error.name === 'AbortError';
        if (isTimeoutOrNetwork) {
          setError("Koneksi timeout atau server sibuk. Silakan coba lagi.");
          toast({
            title: "Koneksi timeout",
            description: "Server sibuk atau tidak merespons. Silakan coba login lagi.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        if (error.message === "Invalid login credentials") {
          // Check if email exists in profiles table (with timeout)
          let profile: any = null;
          try {
            const profilePromise = supabase.from("profiles").select("id").eq("email", email).maybeSingle();
            const profileTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile check timeout')), 3000));
            const profileResult = await Promise.race([profilePromise, profileTimeout]) as any;
            profile = profileResult?.data;
          } catch {
            // If query fails/timeout, assume email exists (show password error)
            profile = { id: 'unknown' };
          }
          if (!profile) {
            // Email tidak terdaftar, redirect ke register dengan pre-filled email
            toast({
              title: "Email tidak terdaftar",
              description: "Silakan daftar terlebih dahulu.",
              variant: "destructive"
            });
            navigate(`/register?email=${encodeURIComponent(email)}`);
            return;
          } else {
            // Email terdaftar tapi password salah
            const errorMessages = ["Password yang Anda masukkan salah. Silakan periksa kembali.", "Password salah. Apakah password Anda baru saja diubah?", "Password tidak benar. Pastikan Anda menggunakan password yang tepat.", "Login gagal. Password yang dimasukkan tidak sesuai dengan akun ini."];
            const randomMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
            setError(randomMessage);
            toast({
              title: "Password Salah",
              description: "Pastikan Anda memasukkan password yang benar atau hubungi admin jika password baru saja diubah.",
              variant: "destructive"
            });
          }
        } else if (error.message === "Email not confirmed") {
          setError("Email belum diverifikasi. Silakan cek email Anda.");
          toast({
            title: "Email belum diverifikasi",
            description: "Silakan cek email Anda dan klik link verifikasi.",
            variant: "destructive"
          });
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // CRITICAL: Set justLoggedIn immediately so auth timeout handler doesn't redirect during post-login queries
      if (data.user) {
        sessionStorage.setItem('justLoggedIn', Date.now().toString());
      }

      // CRITICAL: Check email verification status from profiles table only
      if (data.user) {
        console.log('Login: Authentication successful, checking email verification status...');
        
        // Add timeout to prevent blocking on slow queries
        let profile: any = null;
        let verificationToken: any = null;
        
        try {
          const profilePromise = supabase.from("profiles").select("active_organization_id").eq("user_id", data.user.id).maybeSingle();
          const profileTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile query timeout')), 5000));
          const profileResult = await Promise.race([profilePromise, profileTimeout]) as any;
          profile = profileResult?.data;
        } catch (profileError: any) {
          console.warn('Login: Profile check failed/timeout, continuing:', profileError?.message);
          // Continue without profile - user can still login
        }

        try {
          const verificationPromise = supabase.from('email_verification_tokens').select('email_verified').eq('user_id', data.user.id).eq('email_verified', true).order('used_at', {
            ascending: false
          }).limit(1).maybeSingle();
          const verificationTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Verification query timeout')), 5000));
          const verificationResult = await Promise.race([verificationPromise, verificationTimeout]) as any;
          verificationToken = verificationResult?.data;
        } catch (verificationError: any) {
          console.warn('Login: Verification check failed/timeout, assuming verified:', verificationError?.message);
          // If query fails, assume verified (user already logged in via Supabase auth)
          verificationToken = { email_verified: true };
        }
        
        if (!verificationToken) {
          console.log('Login: Email not verified, redirecting to verify-email page');
          navigate('/verify-email');
          return;
        }

        // Email verified, check if user has organization
        console.log('Login: Email verified, checking organization status...');

        // Clear verification flow flag
        sessionStorage.removeItem('verificationFlow');

        // Check if user has organization
        const hasOrganization = profile && 'active_organization_id' in profile && profile.active_organization_id !== null && profile.active_organization_id !== undefined;
        
        if (!hasOrganization) {
          // User without organization: redirect to create organization
          console.log('Login: User without organization detected, redirecting to create-organization...');
          sessionStorage.removeItem('emailJustVerified');
          
          toast({
            title: "Login berhasil!",
            description: "Silakan buat organisasi Anda terlebih dahulu."
          });
          
          navigate("/create-organization", { replace: true });
        } else {
          // User with organization: show welcome toast and go to home
          // Clear emailJustVerified flag if it exists
          sessionStorage.removeItem('emailJustVerified');
          
          toast({
            title: "Login berhasil",
            description: "Selamat datang kembali!"
          });
          
          // Navigate directly to home page after successful login (justLoggedIn already set above)
          console.log('Login: Success, redirecting to home page...');
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Login: Unexpected error:", err);
      const errorMessage = err?.message || err?.toString() || '';
      if (errorMessage.includes('timeout') || errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
        setError("Koneksi timeout atau server tidak merespons. Silakan coba lagi.");
        toast({
          title: "Koneksi timeout",
          description: "Server tidak merespons. Pastikan koneksi internet stabil dan coba lagi.",
          variant: "destructive"
        });
      } else {
        setError(err?.message || "Terjadi kesalahan saat login. Silakan coba lagi.");
        toast({
          title: "Login gagal",
          description: err?.message || "Terjadi kesalahan. Silakan coba lagi.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication status
  if (checkingAuth) {
    return <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1">
        <AuthTestimonialsPanel />
      </div>
      <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div className="min-h-screen flex">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:flex-1">
        <AuthTestimonialsPanel />
      </div>

      {/* Right Panel - Login Form */}
      <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to ProfitLoop</h1>
            <p className="text-muted-foreground">To get started, please sign in</p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                  <div className="relative">
                    <Input type="email" id="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="" disabled={loading} className="h-12 rounded-md border-border focus:border-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                    <Link to="/forgot-password" className="text-primary text-sm hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input type={showPwd ? "text" : "password"} id="password" name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="" disabled={loading} className="h-12 rounded-md border-border focus:border-primary pr-10" />
                    <button type="button" aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPwd(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground" tabIndex={-1}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-destructive text-sm">{error}</div>}

                <Button type="submit" className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>

                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Don't have a ProfitLoop account?{" "}
                    <Link to="/register" className="text-primary font-medium hover:underline">
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            
          </div>
        </div>
      </div>
    </div>;
};
export default Login;