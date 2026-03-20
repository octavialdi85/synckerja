import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Input } from "@/features/ui/input";
import { Button } from "@/features/ui/button";
import { Label } from "@/features/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

const GAP_ABOVE_KEYBOARD = 12;
const MIN_PASSWORD_LENGTH = 6;

const ResetPassword = () => {
  const { t } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const inputFocusedRef = useRef(false);

  const scrollPanelSoButtonNearKeyboard = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const panel = panelRef.current;
    const btn = submitButtonRef.current;
    if (!panel || !btn || !inputFocusedRef.current) return;
    const vv = window.visualViewport;
    const visibleHeight = vv ? vv.height : window.innerHeight;
    const btnRect = btn.getBoundingClientRect();
    const targetBottom = visibleHeight - GAP_ABOVE_KEYBOARD;
    const scrollDelta = btnRect.bottom - targetBottom;
    if (scrollDelta > 0) {
      panel.scrollTop = Math.max(0, panel.scrollTop + scrollDelta);
    }
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (inputFocusedRef.current) scrollPanelSoButtonNearKeyboard();
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollPanelSoButtonNearKeyboard]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const showHandler = (info: { keyboardHeight: number }) => {
      setKeyboardHeight(info.keyboardHeight ?? 0);
      if (inputFocusedRef.current) {
        setTimeout(scrollPanelSoButtonNearKeyboard, 100);
        setTimeout(scrollPanelSoButtonNearKeyboard, 400);
      }
    };
    const hideHandler = () => setKeyboardHeight(0);
    const showPromise = Keyboard.addListener("keyboardWillShow", showHandler);
    const hidePromise = Keyboard.addListener("keyboardWillHide", hideHandler);
    return () => {
      showPromise.then((h) => h.remove());
      hidePromise.then((h) => h.remove());
    };
  }, [scrollPanelSoButtonNearKeyboard]);

  // Process recovery redirect: Supabase may send token_hash + type in query, or client may have already set session from hash fragment
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!cancelled && verifyError) {
          setHasValidSession(false);
          setCheckingSession(false);
          return;
        }
      }
      // Give client a moment to process hash fragment if present
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      setHasValidSession(!!session);
      setCheckingSession(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.resetPassword.passwordTooShort", "Password must be at least 6 characters"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.passwordMismatch", "Passwords do not match"));
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        toast({
          title: t("auth.resetPassword.title", "Set new password"),
          description: updateError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      toast({
        title: t("auth.resetPassword.title", "Set new password"),
        description: t("auth.resetPassword.success", "Password updated successfully"),
        variant: "default",
      });
      navigate("/login", { replace: true });
    } catch {
      setError(t("auth.forgotPassword.errorGeneric", "Failed to send link. Try again."));
      toast({
        title: t("auth.resetPassword.title", "Set new password"),
        description: t("auth.forgotPassword.errorGeneric", "Failed to send link. Try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="auth-page-fixed flex flex-col lg:flex-row safe-area-top">
        <div className="hidden lg:flex lg:flex-1 lg:order-1">
          <AuthTestimonialsPanel />
        </div>
        <div className="auth-right-panel auth-form-panel-mobile flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-white lg:order-2">
          <div className="w-full max-w-md text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="auth-page-fixed flex flex-col lg:flex-row safe-area-top">
        <div className="hidden lg:flex lg:flex-1 lg:order-1">
          <AuthTestimonialsPanel />
        </div>
        <div className="auth-right-panel auth-form-panel-mobile flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-white lg:order-2">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                {t("auth.resetPassword.title", "Set new password")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.resetPassword.invalidLink", "Invalid or expired link")}
              </p>
            </div>
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0 space-y-4">
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium">
                    <Link to="/forgot-password">{t("auth.forgotPassword.title", "Forgot password")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-12 rounded-md">
                    <Link to="/login">{t("auth.forgotPassword.backToLogin", "Back to login")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-fixed flex flex-col lg:flex-row safe-area-top">
      <div className="hidden lg:flex lg:flex-1 lg:order-1">
        <AuthTestimonialsPanel />
      </div>
      <div
        ref={panelRef}
        className="auth-right-panel auth-form-panel-mobile flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-white lg:order-2"
        style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              {t("auth.resetPassword.title", "Set new password")}
            </h1>
            <p className="text-muted-foreground">
              {t("auth.resetPassword.newPasswordLabel", "New password")}
            </p>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 auth-input-scroll-margin">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t("auth.resetPassword.newPasswordLabel", "New password")} *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? "text" : "password"}
                      id="password"
                      name="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => {
                        inputFocusedRef.current = true;
                        setTimeout(scrollPanelSoButtonNearKeyboard, 150);
                        setTimeout(scrollPanelSoButtonNearKeyboard, 450);
                        setTimeout(scrollPanelSoButtonNearKeyboard, 800);
                      }}
                      onBlur={() => {
                        inputFocusedRef.current = false;
                      }}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      placeholder=""
                      disabled={loading}
                      className="h-12 rounded-md border-border focus:border-primary pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 auth-input-scroll-margin">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    {t("auth.resetPassword.confirmPasswordLabel", "Confirm password")} *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPwd ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => {
                        inputFocusedRef.current = true;
                        setTimeout(scrollPanelSoButtonNearKeyboard, 150);
                        setTimeout(scrollPanelSoButtonNearKeyboard, 450);
                        setTimeout(scrollPanelSoButtonNearKeyboard, 800);
                      }}
                      onBlur={() => {
                        inputFocusedRef.current = false;
                      }}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      placeholder=""
                      disabled={loading}
                      className="h-12 rounded-md border-border focus:border-primary pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPwd((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-destructive text-sm">{error}</div>}

                <Button
                  ref={submitButtonRef}
                  type="submit"
                  className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.resetPassword.submit", "Save password")}
                    </>
                  ) : (
                    t("auth.resetPassword.submit", "Save password")
                  )}
                </Button>

                <div className="text-center mt-4">
                  <Link to="/login" className="text-primary text-sm font-medium hover:underline">
                    {t("auth.forgotPassword.backToLogin", "Back to login")}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
