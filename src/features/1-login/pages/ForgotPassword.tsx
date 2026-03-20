import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { Input } from "@/features/ui/input";
import { Button } from "@/features/ui/button";
import { Label } from "@/features/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

const GAP_ABOVE_KEYBOARD = 12;

const ForgotPassword = () => {
  const { t } = useAppTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const navigate = useNavigate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.forgotPassword.errorInvalidEmail", "Invalid email"));
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });
      if (err) {
        const message = err.message || t("auth.forgotPassword.errorGeneric", "Failed to send link. Try again.");
        setError(message);
        toast({
          title: t("auth.forgotPassword.title", "Forgot password"),
          description: message,
          variant: "destructive",
        });
        return;
      }
      setSuccess(true);
      toast({
        title: t("auth.forgotPassword.title", "Forgot password"),
        description: t("auth.forgotPassword.success", "Check your email for the reset link."),
        variant: "default",
      });
    } catch {
      setError(t("auth.forgotPassword.errorGeneric", "Failed to send link. Try again."));
      toast({
        title: t("auth.forgotPassword.title", "Forgot password"),
        description: t("auth.forgotPassword.errorGeneric", "Failed to send link. Try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Card className="border border-border shadow-sm rounded-lg bg-card">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  {t("auth.forgotPassword.title", "Forgot password")}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t("auth.forgotPassword.description", "Enter your email to receive a reset link")}
                </p>
              </div>

              {success ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("auth.forgotPassword.success", "Check your email for the reset link.")}
                  </p>
                  <Button asChild className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium">
                    <Link to="/login">{t("auth.forgotPassword.backToLogin", "Back to login")}</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2 auth-input-scroll-margin">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t("auth.forgotPassword.emailLabel", "Email")} *
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      placeholder=""
                      disabled={loading}
                      className="h-12 rounded-md border-border focus:border-primary"
                    />
                  </div>

                  {error && (
                    <div className="space-y-1">
                      <div className="text-destructive text-sm">{error}</div>
                      {error.includes("500") || error.toLowerCase().includes("server error") ? (
                        <p className="text-muted-foreground text-xs">
                          {t(
                            "auth.forgotPassword.error500Hint",
                            "Check Dashboard → Auth → Hooks: ensure send-auth-email is deployed and has RESEND_API_KEY and SEND_EMAIL_HOOK_SECRET set."
                          )}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <Button
                    ref={submitButtonRef}
                    type="submit"
                    className="w-full h-12 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.forgotPassword.submit", "Send reset link")}
                      </>
                    ) : (
                      t("auth.forgotPassword.submit", "Send reset link")
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <Link
                      to="/login"
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {t("auth.forgotPassword.backToLogin", "Back to login")}
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
