
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/features/ui/button";
import { Input } from "@/features/ui/input";
import { Label } from "@/features/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/features/ui/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkOrganizationAndRedirect = async (userId: string) => {
    try {
      console.log("Login: Checking organization for user:", userId);
      
      // Check if user has an employee record (which indicates they're part of an organization)
      const { data: employeeData, error: employeeError }: any = await (supabase as any)
        .from('employees')
        .select('id, organization_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      console.log("Login: Employee data:", employeeData, "Error:", employeeError);

      if (employeeData && employeeData.organization_id) {
        console.log("Login: User has organization, redirecting to home");
        navigate("/");
        return;
      }

      // If not an employee, check if user has ever created an organization
      const { data: organizationData, error: orgError }: any = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      console.log("Login: Organization data:", organizationData, "Error:", orgError);

      if (organizationData) {
        console.log("Login: User has created organization before, redirecting to home");
        navigate("/");
      } else {
        console.log("Login: User needs to create organization, redirecting to create-organization");
        navigate("/create-organization");
      }
    } catch (error) {
      console.error("Login: Error checking organization:", error);
      // Default to create organization if there's an error
      navigate("/create-organization");
    }
  };

  useEffect(() => {
    let isUnmounted = false;
    
    const checkExistingSession = async () => {
      try {
        console.log("Login: Checking existing session...");
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Login: Session check result:", !!session?.user, session?.user?.email);
        
        if (isUnmounted) return;
        
        if (session?.user) {
          // Check email verification before redirecting
          const { data: verificationData } = await supabase
            .from('email_verification_tokens')
            .select('used_at')
            .eq('user_id', session.user.id)
            .not('used_at', 'is', null)
            .maybeSingle();

          if (isUnmounted) return;

          console.log("Login: Profile verification:", !!verificationData);

          if (verificationData) {
            console.log("Login: User verified, checking organization status");
            await checkOrganizationAndRedirect(session.user.id);
          } else {
            console.log("Login: User not verified, signing out");
            await supabase.auth.signOut();
            await cleanupAuthState();
          }
        }
      } catch (error) {
        console.error("Login: Error checking session:", error);
        // If there's an auth error, clean up and continue
        await cleanupAuthState();
      } finally {
        if (!isUnmounted) {
          console.log("Login: Auth check complete");
          setIsCheckingAuth(false);
        }
      }
    };

    checkExistingSession();

    const { data: { subscription } }: any = supabase.auth.onAuthStateChange(async (event, session: any) => {
      console.log("Login: Auth state changed:", event, !!session?.user, session?.user?.email);
      
      if (isUnmounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Add a delay to ensure session is properly established
        setTimeout(async () => {
          if (isUnmounted) return;
          
          try {
            // Check email verification before redirecting
          const { data: verificationData }: any = await supabase
              .from('email_verification_tokens')
              .select('used_at')
              .eq('user_id', session.user.id)
              .not('used_at', 'is', null)
              .maybeSingle();

            if (isUnmounted) return;

            console.log("Login: Auth change verification check:", !!verificationData);

            if (verificationData) {
              await checkOrganizationAndRedirect(session.user.id);
            }
          } catch (error) {
            console.error("Login: Error in auth state change:", error);
          }
        }, 200);
      }
    });

    return () => {
      isUnmounted = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const cleanupAuthState = async () => {
    try {
      // Remove all auth-related keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Also clear sessionStorage if it exists
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      
      // Attempt to sign out any existing session
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        // Ignore sign out errors as we're cleaning up
        console.log('Cleanup sign out:', error);
      }
    } catch (error) {
      console.error('Error cleaning up auth state:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Email dan password harus diisi",
        variant: "destructive"
      });
      return;
    }
    
    // Clean up any invalid auth state first
    await cleanupAuthState();
    
    setIsLoading(true);
    try {
      // First check if user exists and is verified before attempting login
      const { data: profileCheck }: any = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', email.trim())
        .maybeSingle();

      if (profileCheck) {
        const { data: verificationCheck }: any = await supabase
          .from('email_verification_tokens')
          .select('used_at')
          .eq('user_id', profileCheck.user_id)
          .not('used_at', 'is', null)
          .maybeSingle();

        if (!verificationCheck) {
        toast({
          title: "Email Belum Diverifikasi",
          description: "Silakan verifikasi email Anda terlebih dahulu",
          variant: "destructive"
        });
        
          setTimeout(() => navigate("/verify-email", { 
            state: { email: email.trim() } 
          }), 2000);
          return;
        }
      }

      const { data, error }: any = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          // Check if user might need to sign up
          const emailCheckError = error.message.toLowerCase();
          if (emailCheckError.includes("invalid") || emailCheckError.includes("credentials")) {
            toast({
              title: "Email tidak terdaftar",
              description: "Silakan daftar terlebih dahulu",
              variant: "destructive"
            });
            // Redirect to signup page for unregistered email
            setTimeout(() => navigate("/signup"), 2000);
            return;
          }
          toast({
            title: "Login Gagal",
            description: "Email atau password tidak valid",
            variant: "destructive"
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Belum Diverifikasi",
            description: "Silakan cek email Anda untuk verifikasi",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login Gagal",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }
      
      if (data.user) {
        // Double-check email verification in email_verification_tokens table
        const { data: verificationData, error: verificationError }: any = await supabase
          .from('email_verification_tokens')
          .select('used_at, email')
          .eq('user_id', data.user.id)
          .not('used_at', 'is', null)
          .maybeSingle();

        if (verificationError) {
          console.error('Verification check error:', verificationError);
          toast({
            title: "Error",
            description: "Terjadi kesalahan saat memeriksa verifikasi",
            variant: "destructive"
          });
          return;
        }

        if (!verificationData) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          await cleanupAuthState();
          
          toast({
            title: "Email Belum Diverifikasi",
            description: "Silakan verifikasi email Anda terlebih dahulu",
            variant: "destructive"
          });
          
          setTimeout(() => navigate("/verify-email", { 
            state: { email: verificationData?.email || email.trim() } 
          }), 2000);
          return;
        }

        toast({
          title: "Login Berhasil",
          description: "Selamat datang kembali!",
          className: "bg-success text-success-foreground"
        });
        // Navigation will be handled by useEffect
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DesktopWarning>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">ProfitLoop</CardTitle>
            <p className="text-muted-foreground text-center">
              Masuk ke akun Anda
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    disabled={isLoading} 
                    className="pl-10 pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <Link to="/signup" className="text-primary hover:text-primary-glow underline-offset-4 hover:underline">
                  Belum punya akun? Daftar di sini
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DesktopWarning>
  );
};

export default Login;
