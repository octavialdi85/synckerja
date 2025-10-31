import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { Badge } from "@/features/ui/badge";
import { Building, Users, CheckCircle, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { useUserData } from "@/features/1-login/hooks/useUserData";
import CreateOrganizationModal from "@/features/1-login/components/CreateOrganization/CreateOrganizationModal";
const EmployeeWelcome = () => {
  const navigate = useNavigate();
  const {
    profile,
    organization,
    userRole,
    loading,
    refreshUserData
  } = useUserData();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const handleContinue = () => {
    setIsRedirecting(true);

    // Mark that user has seen the welcome page
    localStorage.setItem('hasSeenEmployeeWelcome', 'true');

    // Clear all session storage flags
    sessionStorage.removeItem('organizationJustCreated');
    sessionStorage.removeItem('subscriptionJustCreated');
    sessionStorage.removeItem('planSelectionCompleted');
    sessionStorage.removeItem('newOrganizationId');
    sessionStorage.removeItem('navigationAfterOrgCreation');

    // Navigate to main dashboard
    navigate('/', {
      replace: true
    });
  };
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await refreshUserData();
  };

  // Debug logging - use useMemo to prevent re-render loops
  const debugState = useMemo(() => ({
    profile: !!profile,
    organization: !!organization,
    userRole,
    loading
  }), [profile, organization, userRole, loading]);
  useEffect(() => {
    console.log('EmployeeWelcome: Component mounted');
    console.log('EmployeeWelcome: Current state:', debugState);
  }, [debugState]);

  // Additional debug for checking if component reaches main render
  const beforeRenderState = useMemo(() => ({
    loading,
    organization: !!organization
  }), [loading, organization]);
  console.log('EmployeeWelcome: Before render checks', beforeRenderState);

  // Show loading state with retry option after 10 seconds
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <Card className="w-full max-w-md shadow border rounded-2xl bg-white">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Memuat Data...</h2>
            <p className="text-gray-600 text-sm mb-4">Mohon tunggu sebentar...</p>
            
            {retryCount > 0 && <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  Sedang mencoba ulang... ({retryCount}/3)
                </p>
              </div>}

            <Button onClick={handleRetry} variant="outline" size="sm" className="mt-4" disabled={retryCount >= 3}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>;
  }

  // Show error state if no organization data after loading
  if (!loading && !organization) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <Card className="w-full max-w-md shadow border rounded-2xl bg-white">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <Building className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Organisasi tidak ditemukan
            </h2>
            <p className="text-gray-600 mb-4">
              Terjadi kesalahan saat memuat data organisasi Anda.
            </p>
            <div className="space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
              <Button onClick={() => setShowCreateOrgModal(true)} className="w-full">
                Buat Organisasi Baru
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }

  // Main render - show welcome page when data is loaded
  console.log('EmployeeWelcome: Rendering main content');
  return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] py-12 px-4">
      <Card className="w-full max-w-2xl shadow border rounded-2xl bg-white">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Selamat Datang di ProfitLoop!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Organisasi Anda telah berhasil dibuat dan siap digunakan
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Organization Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Building className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Informasi Organisasi</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Nama:</span>
                <span className="font-medium text-blue-900">
                  {organization?.company_name || 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Role Anda:</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {userRole === 'owner' ? 'Pemilik' : userRole || 'Loading...'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Welcome Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Yang Bisa Anda Lakukan</h3>
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Kelola data karyawan dan rekrutmen</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Buat lowongan pekerjaan dan link rekrutmen</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Kelola struktur organisasi dan departemen</span>
              </div>
            </div>
          </div>

          {/* Trial Info */}
          

          {/* Continue Button */}
          <Button onClick={handleContinue} disabled={isRedirecting} className="w-full h-12 text-base font-semibold bg-[#181E29] hover:bg-[#222b3c]">
            {isRedirecting ? <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Mengarahkan...</span>
              </div> : <div className="flex items-center gap-2">
                <span>Mulai Gunakan ProfitLoop</span>
                <ArrowRight className="w-4 h-4" />
              </div>}
          </Button>
        </CardContent>
      </Card>

      <CreateOrganizationModal open={showCreateOrgModal} onOpenChange={setShowCreateOrgModal} onSuccess={() => {
      setShowCreateOrgModal(false);
      // Refresh page to get new organization data
      window.location.reload();
    }} />
    </div>;
};
export default EmployeeWelcome;