import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Input } from "@/features/ui/input";
import { Button } from "@/features/ui/button";
import { Label } from "@/features/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is coming from email verification
  useEffect(() => {
    const fromEmailVerification = sessionStorage.getItem('fromEmailVerification');
    if (fromEmailVerification === 'true') {
      toast({
        title: "Email Berhasil Diverifikasi",
        description: "Silakan login untuk melanjutkan pembuatan organisasi."
      });
      sessionStorage.removeItem('fromEmailVerification');
    }
  }, []);
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
        if (error.message === "Invalid login credentials") {
          // Check if email exists in profiles table
          const {
            data: profile
          } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
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

      // CRITICAL: Check email verification status from profiles table only
      if (data.user) {
        console.log('Login: Authentication successful, checking email verification status...');
        const {
          data: profile,
          error: profileError
        } = await supabase.from("profiles").select("active_organization_id").eq("user_id", data.user.id).maybeSingle();
        if (profileError) {
          console.error('Login: Error checking profile:', profileError);
          // Jangan paksa logout di sini; perlakukan sebagai profil belum ada
          // Lanjut ke cek verifikasi auth di bawah
        }

        // Check email verification status more carefully
        // Check email verification from email_verification_tokens table
        const {
          data: verificationToken
        } = await supabase.from('email_verification_tokens').select('email_verified').eq('user_id', data.user.id).eq('email_verified', true).order('used_at', {
          ascending: false
        }).limit(1).maybeSingle();
        
        if (!verificationToken) {
          console.log('Login: Email not verified, redirecting to verify-email page');
          navigate('/verify-email');
          return;
        }

        // Email verified, check if user has organization
        console.log('Login: Email verified, checking organization status...');

        // Clear verification flow flag
        sessionStorage.removeItem('verificationFlow');

        // Check if user is coming from email verification (new user without profile)
        const emailJustVerified = sessionStorage.getItem('emailJustVerified');
        
        // Check if user has a profile (existing users have profiles)
        const hasProfile = profile !== null;

        if (emailJustVerified === 'true' || !hasProfile) {
          // New user: redirect to create organization
          console.log('Login: New user detected, redirecting to create-organization...');
          sessionStorage.removeItem('emailJustVerified');
          
          toast({
            title: "Login berhasil!",
            description: "Silakan buat organisasi Anda terlebih dahulu."
          });
          
          navigate("/create-organization", { replace: true });
        } else {
          // Existing user: show welcome toast and go to home
          toast({
            title: "Login berhasil",
            description: "Selamat datang kembali!"
          });
          
          // Navigate directly to home page after successful login
          console.log('Login: Success, redirecting to home page...');
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login: Unexpected error:", err);
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };
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
                    <Input type="email" id="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="" disabled={loading} className="h-12 rounded-md border-border focus:border-primary" />
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
                    <Input type={showPwd ? "text" : "password"} id="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="" disabled={loading} className="h-12 rounded-md border-border focus:border-primary pr-10" />
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