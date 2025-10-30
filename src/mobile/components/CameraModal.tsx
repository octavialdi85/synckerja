import React, { useState, useRef, useCallback } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/mobile/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/mobile/components/ui/dialog";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  title: string;
}

export const CameraModal = ({ isOpen, onClose, onCapture, title }: CameraModalProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
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

  // Start camera when modal opens
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
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">Memuat kamera...</p>
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