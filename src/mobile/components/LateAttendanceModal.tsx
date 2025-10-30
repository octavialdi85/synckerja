import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/mobile/components/ui/dialog";
import { Button } from "@/mobile/components/ui/button";
import { Textarea } from "@/mobile/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface LateAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  lateMinutes: number;
  scheduledTime: string;
}

export const LateAttendanceModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  lateMinutes, 
  scheduledTime 
}: LateAttendanceModalProps) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(reason);
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Keterlambatan Terdeteksi
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Anda terlambat {lateMinutes} menit dari jadwal {scheduledTime}. 
            Mohon berikan alasan keterlambatan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Alasan Keterlambatan <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="reason"
              placeholder="Masukkan alasan keterlambatan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={200}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/200
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={!reason.trim() || isSubmitting}
            >
              {isSubmitting ? "Menyimpan..." : "Konfirmasi"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};