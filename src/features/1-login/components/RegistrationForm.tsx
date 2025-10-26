import { useState, useEffect } from "react";
import { Button } from "@/features/ui/button";
import { Input } from "@/features/ui/input";
import { Label } from "@/features/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRegistration } from "@/features/1-login/hooks/useRegistration";
import { Eye, EyeOff, Building, CheckCircle, AlertCircle } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/features/1-login/utils/error-toast";
import { Alert, AlertDescription } from "@/features/ui/alert";
export const RegistrationForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({
    type: null,
    message: ''
  });
  const {
    register,
    loading
  } = useRegistration();

  // Password validation function
  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("Minimal 8 karakter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Harus mengandung angka");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Harus mengandung karakter khusus");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Harus mengandung huruf besar");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Harus mengandung huruf kecil");
    }
    return errors;
  };

  // Handle password change with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordErrors(validatePassword(newPassword));
  };
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check for email status from registration process
    const emailError = sessionStorage.getItem('emailError');
    if (emailError) {
      setEmailStatus({
        type: 'error',
        message: `Gagal mengirim email konfirmasi: ${emailError}`
      });
      sessionStorage.removeItem('emailError');
    }

    // Check if registration was successful
    const fromRegistration = sessionStorage.getItem('fromRegistration');
    if (fromRegistration) {
      setEmailStatus({
        type: 'success',
        message: 'Email konfirmasi berhasil dikirim! Silakan cek inbox Anda.'
      });
      sessionStorage.removeItem('fromRegistration');
    }
  }, [searchParams]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous email status
    setEmailStatus({
      type: null,
      message: ''
    });
    // Check password strength
    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      showErrorToast({
        title: "Password tidak memenuhi syarat",
        message: passwordValidationErrors.join(", ")
      });
      return;
    }
    if (password !== confirmPassword) {
      showErrorToast({
        title: "Password tidak cocok",
        message: "Silakan pastikan password dan konfirmasi password sama"
      });
      return;
    }
    try {
      await register(fullName, email, password, confirmPassword);
      // Navigation will be handled by the register function itself
    } catch (error) {
      console.error('Registration error:', error);
    }
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to ProfitLoop</h1>
        <p className="text-muted-foreground">Start your 14-day free trial. No credit card required.</p>
      </div>

      {emailStatus.type && <Alert className={`${emailStatus.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <AlertDescription className={`${emailStatus.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
            {emailStatus.message}
          </AlertDescription>
        </Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">Name *</Label>
          <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="" required disabled={loading} className="h-12 rounded-md border-border focus:border-primary" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="" required disabled={loading} className="h-12 rounded-md border-border focus:border-primary" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={handlePasswordChange} placeholder="" required disabled={loading} className="h-12 rounded-md border-border focus:border-primary pr-10" />
            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
          {password && <div className="text-xs space-y-1 mt-2">
              <p className="font-medium text-gray-700">Password requirements:</p>
              <ul className="space-y-1">
                <li className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                  {password.length >= 8 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                  {/[0-9]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Contains a number
                </li>
                <li className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Contains special character
                </li>
                <li className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                  {/[A-Z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Contains uppercase letter
                </li>
                <li className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                  {/[a-z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Contains lowercase letter
                </li>
              </ul>
            </div>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
          <div className="relative">
            <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="" required disabled={loading} className="h-12 rounded-md border-border focus:border-primary pr-10" />
            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
              {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium mt-6" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </Button>

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            By submitting the form you confirm that you accept our{" "}
            <a href="#" className="text-primary hover:underline">Terms & Conditions</a> and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </form>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          Already have a ProfitLoop account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>;
};