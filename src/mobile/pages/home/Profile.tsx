import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Card } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { User, MapPin, Phone, Mail, Calendar, LogOut, ChevronDown, Building2, Check, Loader2 } from "lucide-react";
import { useProfile } from "@/mobile/hooks/useProfile";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/features/ui/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/mobile/components/ui/dropdown-menu";
import { ProfilePhotoUpload } from "@/mobile/components/ProfilePhotoUpload";
import { clearCurrentOrgCacheForUser } from "@/features/1-login/hooks/useCurrentOrg";
const ProfileSkeleton = () => <div className="p-2 space-y-2">
    {/* Profile Info Skeleton */}
    <Card className="bg-gradient-card border border-border">
      <div className="p-4 text-center">
        <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
        <Skeleton className="h-6 w-32 mx-auto mb-1" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    </Card>

    {/* Personal Details Skeleton */}
    <Card className="bg-gradient-card border border-border">
      <div className="p-3 border-b border-border">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>)}
      </div>
    </Card>

    {/* Work Info Skeleton */}
    <Card className="bg-gradient-card border border-border">
      <div className="p-3 border-b border-border">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-2 space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>)}
      </div>
    </Card>

    {/* Actions Skeleton */}
    <div className="space-y-1">
      <Skeleton className="w-full h-12 rounded-lg" />
      <Skeleton className="w-full h-12 rounded-lg" />
    </div>
  </div>;
const Profile = () => {
  const {
    profile,
    loading,
    error,
    logout,
    refetch
  } = useProfile();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<any>(null);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  // UX: cap skeleton to avoid long perceived loading
  const [showSkeleton, setShowSkeleton] = useState(true);
  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      const id = setTimeout(() => setShowSkeleton(false), 1200);
      return () => clearTimeout(id);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);
  useStatusBarStyle('light');
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Berhasil logout",
        description: "Anda telah berhasil keluar dari sistem"
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal logout. Silakan coba lagi.",
        variant: "destructive"
      });
    }
  };

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organizations through user_organizations table
      const { data: userOrgs }: any = await (supabase as any)
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (userOrgs && userOrgs.length > 0) {
        // Get organization details
        const orgIds = userOrgs.map(uo => uo.organization_id);
        const { data: orgsData }: any = await (supabase as any)
          .from('organizations')
          .select('id, company_name, industry')
          .in('id', orgIds);
        if (orgsData) {
          setOrganizations(orgsData);

          // Get current active organization from profile
          const { data: profileData }: any = await (supabase as any)
            .from('profiles')
            .select('active_organization_id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profileData?.active_organization_id) {
            const activeOrg = orgsData.find(org => org.id === profileData.active_organization_id);
            setCurrentOrganization(activeOrg);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setOrganizationsLoading(false);
    }
  };
  const switchOrganization = async (organizationId: string) => {
    if (switchingOrganization) return; // Prevent multiple switches

    try {
      setSwitchingOrganization(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const selectedOrg = organizations.find(org => org.id === organizationId);

      // Show immediate feedback
      toast({
        title: "Beralih organisasi...",
        description: `Berpindah ke ${selectedOrg?.company_name}`
      });

      // Start fade transition
      setFadeOut(true);

      // Update active organization in profile
      const {
        error
      } = await supabase.from('profiles').update({
        active_organization_id: organizationId
      }).eq('user_id', user.id);
      if (error) throw error;

      // CRITICAL: Clear useCurrentOrg memory + localStorage cache so Daily Task, Initiative, etc. use the new org
      try {
        clearCurrentOrgCacheForUser(user.id);
        window.dispatchEvent(new CustomEvent('organization-switched', { detail: { organizationId } }));
      } catch (e) {
        console.warn('Failed to clear org cache on switch:', e);
      }

      // Wait for fade animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update current organization state
      setCurrentOrganization(selectedOrg);
      
      // Refetch profile data for the new organization
      await refetch();
      
      toast({
        title: "Berhasil",
        description: `Berhasil beralih ke ${selectedOrg?.company_name}`
      });

      // Fade back in smoothly
      setFadeOut(false);
      setSwitchingOrganization(false);
    } catch (error) {
      setFadeOut(false);
      setSwitchingOrganization(false);
      toast({
        title: "Error",
        description: "Gagal beralih organisasi",
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    if (!loading && profile) {
      fetchOrganizations();
    }
  }, [loading, profile]);
  if (showSkeleton) {
    return (
      <DesktopWarning>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <main
              className="flex flex-col bg-background fixed inset-x-0 z-0"
              style={{
                top: viewportOffsetTop,
                height: viewportHeight > 0 ? viewportHeight : undefined,
                minHeight: viewportHeight > 0 ? undefined : "100dvh",
              }}
            >
              <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
                <SidebarTrigger />
                <div></div>
              </header>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
                  <ProfileSkeleton />
                </div>
              </div>
              <div className="flex-shrink-0" style={{ height: "80px" }} aria-hidden />
              <NavigationFooter className="safe-area-bottom-lower" />
            </main>
          </div>
        </SidebarProvider>
      </DesktopWarning>
    );
  }
  if (error || !profile) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main
            className="flex flex-col bg-background fixed inset-x-0 z-0"
            style={{
              top: viewportOffsetTop,
              height: viewportHeight > 0 ? viewportHeight : undefined,
              minHeight: viewportHeight > 0 ? undefined : "100dvh",
            }}
          >
            <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
              <SidebarTrigger />
              <div></div>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-destructive mb-4">Gagal memuat profil</p>
                  <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0" style={{ height: "80px" }} aria-hidden />
            <NavigationFooter className="safe-area-bottom-lower" />
          </main>
        </div>
      </SidebarProvider>
    );
  }
  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <main
            className="flex flex-col bg-background fixed inset-x-0 z-0"
            style={{
              top: viewportOffsetTop,
              height: viewportHeight > 0 ? viewportHeight : undefined,
              minHeight: viewportHeight > 0 ? undefined : "100dvh",
            }}
          >
            <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
              <SidebarTrigger />
              <div></div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
                <div className={`p-2 space-y-2 transition-all duration-300 ${fadeOut ? "opacity-50 scale-95" : "opacity-100 scale-100"}`}>
              {/* Profile Info */}
              <Card className="bg-gradient-card border border-border">
                <div className="p-4 text-center">
                  <ProfilePhotoUpload profile={profile} />
                  <h2 className="text-xl font-semibold text-foreground mb-1 mt-3">{profile.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.job_position_name || 'Karyawan'}</p>
                </div>
              </Card>

              {/* Personal Details */}
              <Card className="bg-gradient-card border border-border">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">Informasi Personal</h3>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium text-foreground">{profile.email}</p>
                    </div>
                  </div>
                  {profile.mobile_phone && <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telepon</p>
                        <p className="text-sm font-medium text-foreground">{profile.mobile_phone}</p>
                      </div>
                    </div>}
                  {profile.address && <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Alamat</p>
                        <p className="text-sm font-medium text-foreground">{profile.address}</p>
                      </div>
                    </div>}
                  {profile.join_date && <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bergabung</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(profile.join_date).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                        </p>
                      </div>
                    </div>}
                </div>
              </Card>

              {/* Work Info */}
              <Card className="bg-gradient-card border border-border">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">Informasi Kerja</h3>
                </div>
                <div className="p-3 space-y-3">
                  {profile.job_position_name && <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Posisi</span>
                      <span className="text-sm font-medium text-foreground">{profile.job_position_name}</span>
                    </div>}
                  {profile.department_name && <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Departemen</span>
                      <span className="text-sm font-medium text-foreground">{profile.department_name}</span>
                    </div>}
                  {profile.job_level_name && <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Level</span>
                      <span className="text-sm font-medium text-foreground">{profile.job_level_name}</span>
                    </div>}
                  {profile.employee_id && <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ID Karyawan</span>
                      <span className="text-sm font-medium text-foreground">{profile.employee_id}</span>
                    </div>}
                  {profile.status && <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="text-sm font-medium text-foreground capitalize">{profile.status}</span>
                    </div>}
                </div>
              </Card>

              {/* Organization Management */}
              <Card className="bg-gradient-card border border-border">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">Organisasi Anda ({organizations.length})</h3>
                </div>
                <div className="p-3 space-y-3">
                  {/* Current Organization Dropdown */}
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild disabled={switchingOrganization}>
                       <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary-foreground" />
                          </div>
                           <div>
                             <p className="font-medium text-foreground">
                               {organizationsLoading ? "Memuat..." : switchingOrganization ? "Beralih organisasi..." : currentOrganization?.company_name || "Pilih Organisasi"}
                             </p>
                             <p className="text-xs text-muted-foreground">Owner</p>
                           </div>
                        </div>
                         <div className="flex items-center gap-2">
                           {switchingOrganization ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <>
                               <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                 <Check className="w-3 h-3 text-white" />
                               </div>
                               <ChevronDown className="h-4 w-4 text-muted-foreground" />
                             </>}
                         </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full min-w-[280px] bg-popover border-border">
                       {organizations.map(org => <DropdownMenuItem key={org.id} onClick={() => switchOrganization(org.id)} disabled={switchingOrganization || currentOrganization?.id === org.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                            <Building2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{org.company_name}</p>
                            <p className="text-xs text-muted-foreground">{org.industry}</p>
                          </div>
                          {currentOrganization?.id === org.id && <Check className="h-4 w-4 text-green-500" />}
                        </DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Create New Organization Button */}
                  <Button variant="outline" className="w-full h-12 border-border hover:bg-muted justify-start" onClick={() => navigate('/create-organization')}>
                    <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Organisasi Baru
                  </Button>
                </div>
              </Card>

              {/* Profile Actions */}
              <div className="space-y-2">
                
                <Button variant="outline" className="w-full h-12 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground justify-start" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-3" />
                  Keluar
                </Button>
              </div>
            </div>
            </div>
          </div>

          <div className="flex-shrink-0" style={{ height: "80px" }} aria-hidden />
          <NavigationFooter className="safe-area-bottom-lower" />
        </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
};
export default Profile;