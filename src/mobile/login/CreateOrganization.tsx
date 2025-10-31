
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import OrganizationForm from "@/features/1-login/components/CreateOrganization/OrganizationForm";
import { useNavigate } from "react-router-dom";
import { Building, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useCentralizedUserData } from "@/features/1-login/contexts/CentralizedUserDataContext";

const CreateOrganization = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isEmailVerified, hasOrganization, loading } = useCentralizedUserData();

  // Helper function untuk membaca sessionStorage flags
  const getSessionFlags = () => {
    if (typeof window === 'undefined') return { emailJustVerified: false, organizationJustCreated: false };
    return {
      emailJustVerified: sessionStorage.getItem('emailJustVerified') === 'true',
      organizationJustCreated: sessionStorage.getItem('organizationJustCreated') === 'true'
    };
  };

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return;

    // Read session flags fresh on each effect run
    const sessionFlags = getSessionFlags();

    // IMPORTANT: Skip SEMUA checks jika organization baru saja dibuat
    // Ini mencegah redirect yang mengganggu flow dari OrganizationForm ke create-plan
    // Juga skip jika sedang di halaman create-plan (mencegah redirect loop)
    const currentPath = window.location.pathname;
    if (sessionFlags.organizationJustCreated || currentPath === '/create-plan') {
      console.log('CreateOrganization: Organization just created or on create-plan page, skipping all redirect checks');
      return;
    }

    // Redirect ke login jika tidak authenticated
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Redirect ke verify-email jika email belum verified (kecuali baru verified)
    if (!isEmailVerified && !sessionFlags.emailJustVerified) {
      navigate('/verify-email', { replace: true });
      return;
    }
    
    // Clear emailJustVerified flag setelah digunakan
    if (sessionFlags.emailJustVerified) {
      sessionStorage.removeItem('emailJustVerified');
    }
    
    // HAPUS redirect ke home - biarkan OrganizationForm handle redirect
    // Jika user sudah punya organization, mereka tidak akan sampai ke halaman ini
    // karena akan di-block di HomeAccessGuard atau routing level
  }, [isAuthenticated, isEmailVerified, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 safe-area-inset">
        <Card className="w-full max-w-md shadow-sm border rounded-xl bg-white">
          <CardContent className="p-4 sm:p-6 text-center">
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Memuat Data...</h2>
            <p className="text-gray-600 text-xs sm:text-sm">Mohon tunggu sebentar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-[#f8fafc] py-4 sm:py-8 px-3 sm:px-4 safe-area-inset">
      <Card className="w-full max-w-full sm:max-w-2xl shadow-sm border rounded-xl sm:rounded-2xl bg-white">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/login")}
              className="p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9 -ml-1"
            >
              <ArrowLeft size={18} className="sm:w-4 sm:h-4" />
            </Button>
            <Building size={20} className="sm:w-6 sm:h-6 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
            Buat Organisasi Pertama
          </CardTitle>
          <p className="text-muted-foreground text-sm sm:text-base mt-1.5 sm:mt-2 leading-relaxed">
            Lengkapi informasi organisasi Anda untuk mulai menggunakan ProfitLoop
          </p>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
          <OrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganization;
