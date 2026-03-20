import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/features/ui/card";
import { RegistrationForm } from "@/features/1-login/components/RegistrationForm";
import { AuthTestimonialsPanel } from "@/features/1-login/AuthTestimonialsPanel";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

const GAP_ABOVE_KEYBOARD = 12;

const Register = () => {
  const [searchParams] = useSearchParams();
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

  // Pre-fill email jika ada di URL params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      // This functionality could be enhanced by passing email to RegistrationForm
      // For now, keeping the existing structure to maintain functionality
    }
  }, [searchParams]);

  return (
    <div className="auth-page-fixed flex safe-area-top">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:flex-1">
        <AuthTestimonialsPanel />
      </div>

      {/* Right Panel - Registration Form — keyboard padding on native so Sign up sits above keyboard */}
      <div
        ref={panelRef}
        className="auth-right-panel auth-form-panel-mobile flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden"
        style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}
      >
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <RegistrationForm
                submitButtonRef={submitButtonRef}
                onKeyboardInputFocus={() => { inputFocusedRef.current = true; setTimeout(scrollPanelSoButtonNearKeyboard, 150); setTimeout(scrollPanelSoButtonNearKeyboard, 450); setTimeout(scrollPanelSoButtonNearKeyboard, 800); }}
                onKeyboardInputBlur={() => { inputFocusedRef.current = false; }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
