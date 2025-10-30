import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/ui/dialog";
import { Button } from "@/features/ui/button";
import { Building, X } from "lucide-react";
import OrganizationForm from "./OrganizationForm";

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateOrganizationModal = ({ open, onOpenChange, onSuccess }: CreateOrganizationModalProps) => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
    // Redirect to plan selection to ensure subscription record is created
    navigate('/create-plan');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto seamless-scroll">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building size={24} className="text-primary" />
              <DialogTitle className="text-2xl font-bold">
                Buat Organisasi Baru
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="p-2"
            >
              <X size={16} />
            </Button>
          </div>
          <p className="text-muted-foreground text-left">
            Lengkapi informasi organisasi baru untuk mulai bekerja
          </p>
        </DialogHeader>
        <div className="mt-6">
          <OrganizationForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganizationModal;


