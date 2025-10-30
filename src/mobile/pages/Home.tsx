import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/features/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, MapPin, Users } from "lucide-react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check if user has completed the organization setup
          const { data: profileData }: any = await (supabase as any)
            .from('profiles')
            .select('active_organization_id, organization_created')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          // Check if user is verified
          const { data: verificationData }: any = await (supabase as any)
            .from('email_verification_tokens')
            .select('used_at')
            .eq('user_id', session.user.id)
            .not('used_at', 'is', null)
            .maybeSingle();
          
          if (verificationData && profileData?.active_organization_id) {
            const hasCompletedWelcome = sessionStorage.getItem('welcomeCompleted');
            if (hasCompletedWelcome) {
              // User has completed all steps, redirect to home
              navigate("/");
              return;
            }
          }
          // If user hasn't completed setup, ProtectedRoute will handle the redirection
          navigate("/");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } }: any = supabase.auth.onAuthStateChange((event, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DesktopWarning>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">
                Sistem Absensi
              </h1>
              <Link to="/login">
                <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                  Masuk
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Kelola Absensi
              <span className="text-primary block">Dengan Mudah</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sistem absensi modern dengan fitur lokasi GPS, kamera real-time, 
              dan laporan komprehensif untuk perusahaan Anda.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-3">
                Mulai Sekarang
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-card border-border shadow-card text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-foreground">Real-time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pantau kehadiran karyawan secara real-time dengan sistem yang akurat dan terpercaya.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-card text-center">
              <CardHeader>
                <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-foreground">GPS Location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Verifikasi lokasi absensi dengan teknologi GPS untuk memastikan karyawan di tempat kerja.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-card text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-foreground">Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Kelola tim dan departemen dengan mudah, lihat laporan kehadiran yang komprehensif.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Siap Memulai?
            </h3>
            <p className="text-muted-foreground mb-6">
              Bergabunglah dengan sistem absensi modern untuk meningkatkan produktivitas tim Anda.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Masuk ke Sistem
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-muted-foreground">
              <p>&copy; 2024 Sistem Absensi. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </DesktopWarning>
  );
};

export default Home;