import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/features/ui/button";
import { Card, CardContent } from "@/features/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/features/ui/use-toast";
import { Building2, Users, Star, Rocket, ArrowRight } from "lucide-react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
let confetti: any;
try {
  // Optional import to avoid type errors when not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  confetti = require("canvas-confetti");
} catch {}

const EmployeeWelcome = () => {
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user came from create-organization
    const fromCreateOrg = location.state?.fromCreateOrganization;
    if (!fromCreateOrg) {
      navigate("/", { replace: true });
      return;
    }

    // Trigger confetti animation - reduced
    const duration = 1500;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const confettiAnimation = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return;
      }

      const particleCount = 0.5 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 6,
        spread: 60,
        origin: {
          x: randomInRange(0.2, 0.8),
          y: Math.random() - 0.1,
        },
      });

      requestAnimationFrame(confettiAnimation);
    };

    confettiAnimation();

    // Fetch organization and user data
    fetchData();
  }, [location.state, navigate]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Get user profile with organization data
      const { data: profile }: any = await (supabase as any)
        .from('profiles')
        .select(`
          *,
          organizations:active_organization_id (
            company_name,
            industry,
            employee_count
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profile?.organizations) {
        setOrganizationData(profile.organizations);
      }

      // Get user role
      const { data: userRoleData }: any = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile?.active_organization_id)
        .single();

      if (userRoleData) {
        setUserRole(userRoleData.role);
      }

    } catch (error: any) {
      console.error("Fetch data error:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil data organisasi",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterApp = () => {
    // Mark welcome as completed
    sessionStorage.setItem('welcomeCompleted', 'true');
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <DesktopWarning>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-primary/20 rounded-full animate-bounce"></div>
          </div>
        </div>
      </DesktopWarning>
    );
  }

  return (
    <DesktopWarning>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse"></div>
              <div className="relative bg-background rounded-full w-full h-full flex items-center justify-center border-4 border-primary/20">
                <Star className="h-8 w-8 text-primary animate-bounce" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              🎉 Selamat Datang!
            </h1>
            <p className="text-muted-foreground text-sm">
              Organisasi Anda telah berhasil dibuat
            </p>
          </div>

          {/* Organization Info Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground text-lg">
                    {organizationData?.company_name || "Organisasi Anda"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {organizationData?.industry || "Industri"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <Users className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Tim</p>
                  <p className="font-semibold text-foreground">
                    {organizationData?.employee_count || "1-10 karyawan"}
                  </p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <Rocket className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Role Anda</p>
                  <p className="font-semibold text-foreground capitalize">
                    {userRole === 'owner' ? 'Pemilik' : 
                     userRole === 'admin' ? 'Admin' :
                     userRole === 'hr' ? 'HR' : 'Karyawan'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Welcome Message */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-foreground mb-3">
                🚀 Perjalanan Baru Dimulai!
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✨ Sistem absensi digital siap digunakan</p>
                <p>📊 Dashboard analitik tersedia</p>
                <p>📅 Manajemen jadwal terintegrasi</p>
                <p>📈 Laporan otomatis setiap bulan</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button 
            onClick={handleEnterApp}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group"
          >
            Masuk ke Aplikasi
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Mulai kelola tim Anda dengan ProfitLoop
            </p>
          </div>
        </div>
      </div>
    </DesktopWarning>
  );
};

export default EmployeeWelcome;