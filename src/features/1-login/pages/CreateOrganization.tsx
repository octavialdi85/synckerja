
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import OrganizationForm from "@/features/1-login/components/CreateOrganization/OrganizationForm";
import { usePageAccessControl } from "@/features/1-login/hooks/usePageAccessControl";
import { useMultiOrganization } from "@/features/1-login/hooks/useMultiOrganization";
import { useNavigate } from "react-router-dom";
import { Building, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useCentralizedUserData } from "@/features/1-login/contexts/CentralizedUserDataContext";
const CreateOrganization = () => {
  const navigate = useNavigate();
  const { userOrganizations, loading: orgLoading } = useMultiOrganization();
  const { isAuthenticated, isEmailVerified, hasOrganization, loading } = useCentralizedUserData();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isEmailVerified) {
      navigate('/verify-email', { replace: true });
      return;
    }
    if (hasOrganization) {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, isEmailVerified, hasOrganization, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] py-12">
      <Card className="w-full max-w-2xl shadow border rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/login")}
              className="p-2"
            >
              <ArrowLeft size={16} />
            </Button>
            <Building size={24} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Buat Organisasi Pertama
          </CardTitle>
          <p className="text-muted-foreground">
            Lengkapi informasi organisasi Anda untuk mulai menggunakan ProfitLoop
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <OrganizationForm onSuccess={() => {
            // Navigate to create plan after organization is created
            navigate('/create-plan', { replace: true });
          }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganization;
