
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { sendConfirmationEmail } from "@/features/1-login/utils/emailConfirmation";
import { validateEmailFormat, sanitizeEmail } from "@/features/1-login/utils/emailValidation";

export const useRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const navigate = useNavigate();

  const register = async (fullName: string, email: string, password: string, password2: string) => {
    setError(null);
    setEmailSuggestion(null);

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }
    if (password !== password2) {
      setError("Konfirmasi password tidak sesuai");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    
    // Validate password strength
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    
    if (!hasNumber) {
      setError("Password harus mengandung angka");
      return;
    }
    
    if (!hasSpecialChar) {
      setError("Password harus mengandung karakter khusus");
      return;
    }
    
    if (!hasUpperCase) {
      setError("Password harus mengandung huruf besar");
      return;
    }
    
    if (!hasLowerCase) {
      setError("Password harus mengandung huruf kecil");
      return;
    }

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    const emailValidation = validateEmailFormat(sanitizedEmail);
    
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Email tidak valid");
      if (emailValidation.suggestion) {
        setEmailSuggestion(emailValidation.suggestion);
      }
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", sanitizedEmail)
        .maybeSingle();

      if (existingUser) {
        setError("Email sudah terdaftar. Silakan gunakan email lain atau login.");
        return;
      }

      // Set registration flow flags
      sessionStorage.setItem('registrationInProgress', 'true');
      sessionStorage.setItem('registrationFlow', 'true');
      sessionStorage.setItem('fromRegistration', 'true');
      sessionStorage.setItem('userEmail', sanitizedEmail);
      sessionStorage.setItem('userName', fullName.trim());

      console.log('Starting registration process for:', sanitizedEmail);

      // OPTIMIZED: Simplified registration without immediate logout
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: { 
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/email-verified`
        },
      });

      if (error) {
        console.error("Registration error:", error);

        // Handle existing user: resend verification email and proceed
        if (error.message?.toLowerCase().includes("already")) {
          try {
            console.log("User already exists. Resending confirmation email...");
            await sendConfirmationEmail(sanitizedEmail, fullName.trim(), window.location.origin);

            toast({
              title: "Akun Sudah Terdaftar",
              description: "Kami telah mengirim ulang email verifikasi. Silakan cek inbox Anda.",
              variant: "default",
            });

            // Keep registration flow flags for verification page
            sessionStorage.removeItem('registrationInProgress');
            navigate("/verify-email", { replace: true });
          } catch (emailError) {
            console.error("Resend confirmation email failed:", emailError);
            toast({
              title: "Kirim Ulang Email Gagal",
              description: emailError instanceof Error ? emailError.message : "Terjadi kesalahan saat mengirim ulang email.",
              variant: "destructive",
            });
            sessionStorage.removeItem('registrationInProgress');
            navigate("/verify-email", { replace: true });
          }
          return;
        }

        // Default error handling
        setError(error.message);
        toast({ 
          title: "Registrasi Gagal", 
          description: error.message, 
          variant: "destructive" 
        });
        // Clear registration flags on error
        sessionStorage.removeItem('registrationInProgress');
        sessionStorage.removeItem('registrationFlow');
        sessionStorage.removeItem('fromRegistration');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userName');
        return;
      }

      // If registration successful
      if (data.user) {
        console.log("User registered successfully:", data.user.id);
        
        // Store user info for verification process
        sessionStorage.setItem('pendingUserId', data.user.id);
        sessionStorage.setItem('registrationFlow', 'true');
        sessionStorage.setItem('fromRegistration', 'true');
        sessionStorage.setItem('userEmail', sanitizedEmail);
        sessionStorage.setItem('userName', fullName.trim());
        
        // Wait a bit for database triggers to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send confirmation email dengan custom link
        try {
          console.log('Sending confirmation email...');
          
          await sendConfirmationEmail(sanitizedEmail, fullName.trim(), window.location.origin);
          console.log("Custom confirmation email sent successfully via Resend");
          
          // Show success toast notification
          toast({ 
            title: "Registrasi Berhasil!", 
            description: "Email konfirmasi telah dikirim. Silakan cek inbox Anda untuk mengaktifkan akun.", 
            variant: "default" 
          });
          
          // Clear registration in progress flag but keep flow flags
          sessionStorage.removeItem('registrationInProgress');
          
          // Navigate to verify-email page immediately
          navigate("/verify-email", { replace: true });
          
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
          
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
          if (errorMessage.includes('550') || errorMessage.includes('bounce') || errorMessage.includes('does not exist')) {
            sessionStorage.setItem('emailError', "Email yang Anda masukkan tidak valid atau tidak ada. Silakan periksa kembali alamat email Anda.");
          } else {
            sessionStorage.setItem('emailError', errorMessage);
          }
          
          // Show error toast but still navigate
          toast({ 
            title: "Email Terkirim dengan Peringatan", 
            description: "Akun berhasil dibuat, namun ada masalah dengan pengiriman email konfirmasi. Silakan periksa email Anda.", 
            variant: "destructive" 
          });
          
          sessionStorage.removeItem('registrationInProgress');
          navigate("/verify-email", { replace: true });
        }
        
        return;
      }

      setError("Terjadi kesalahan saat mendaftar. Silakan coba lagi.");
      
    } catch (err) {
      console.error("Registration error:", err);
      setError("Terjadi kesalahan saat mendaftar. Silakan coba lagi.");
      toast({ 
        title: "Registrasi Gagal", 
        description: "Terjadi kesalahan saat mendaftar.", 
        variant: "destructive" 
      });
      // Clear registration flags on error
      sessionStorage.removeItem('registrationInProgress');
      sessionStorage.removeItem('registrationFlow');
      sessionStorage.removeItem('fromRegistration');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userName');
    } finally {
      setLoading(false);
    }
  };

  const acceptEmailSuggestion = (suggestedEmail: string) => {
    setEmailSuggestion(null);
    setError(null);
    return suggestedEmail;
  };

  return {
    register,
    loading,
    error,
    emailSuggestion,
    acceptEmailSuggestion
  };
};
