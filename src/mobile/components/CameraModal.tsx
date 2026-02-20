import React, { useState, useRef, useCallback } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/mobile/components/ui/button";
import { logger } from "@/config/logger";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/mobile/components/ui/dialog";
import { useToast } from "@/mobile/components/ui/use-toast";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  title: string;
}

export const CameraModal = ({ isOpen, onClose, onCapture, title }: CameraModalProps) => {
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      logger.error("Error accessing camera:", error);
      toast({
        title: "Error Kamera",
        description: "Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    const current = streamRef.current;
    if (current) {
      current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
      }
    }
  }, []);

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  React.useEffect(() => {
    if (isOpen && !stream) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, stream, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ambil foto menggunakan kamera untuk absensi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas ref={canvasRef} className="hidden" />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Skeleton className="h-24 w-24 rounded-lg" />
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex gap-2">
            {!capturedImage ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Batal
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!stream || isLoading}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Ambil Foto
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Ulangi
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  Konfirmasi
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
