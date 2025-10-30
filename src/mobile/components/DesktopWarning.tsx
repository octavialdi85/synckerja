
import { useEffect, useState } from "react";
import { useIsMobile } from "@/mobile/hooks/use-mobile";
import { Card } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { AlertTriangle, Smartphone, X } from "lucide-react";

interface DesktopWarningProps {
  children: React.ReactNode;
}

export const DesktopWarning = ({ children }: DesktopWarningProps) => {
  const isMobile = useIsMobile();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false after mobile detection is complete
    if (isMobile !== undefined) {
      setIsLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile === false) {
      const currentUrl = window.location.href;
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
      setQrCodeUrl(apiUrl);
    }
  }, [isMobile]);

  // Show loading state while detecting device type
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Block access for desktop users completely
  if (isMobile === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center bg-gradient-card border border-border">
          
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-warning/10 p-3">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Akses dari Perangkat Mobile
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Halaman ini dioptimalkan untuk perangkat mobile. Silakan buka menggunakan smartphone Anda untuk pengalaman terbaik.
          </p>

          {qrCodeUrl && (
            <div className="mb-6">
              <div className="flex justify-center mb-3">
                <div className="bg-white p-3 rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Scan QR Code dengan smartphone Anda</span>
              </div>
            </div>
          )}

        </Card>
      </div>
    );
  }

  // Show normal content only for mobile users
  return <>{children}</>;
};
