import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { RegistrationForm } from "@/features/1-login/components/RegistrationForm";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";

const Register = () => {
  const [searchParams] = useSearchParams();

  // Pre-fill email jika ada di URL params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      // This functionality could be enhanced by passing email to RegistrationForm
      // For now, keeping the existing structure to maintain functionality
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:flex-1">
        <AuthTestimonialsPanel />
      </div>

      {/* Right Panel - Registration Form */}
      <div className="auth-right-panel flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <RegistrationForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
