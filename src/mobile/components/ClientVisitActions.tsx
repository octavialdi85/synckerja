import { useState } from "react";
import { Button } from "@/mobile/components/ui/button";
import { MapPin, Clock } from "lucide-react";
import { ClientLocationValidator } from "./ClientLocationValidator";

interface LocationValidationResult {
  is_valid: boolean;
  location_id?: string;
  location_name?: string;
  location_type?: string;
  distance_meters?: number;
  allowed_radius_meters?: number;
  accuracy_meters?: number;
  error?: string;
}

interface ClientVisitActionsProps {
  onStartVisit: () => void;
  onEndVisit: () => void;
  hasActiveVisit: boolean;
  isLoading?: boolean;
}

export const ClientVisitActions = ({ 
  onStartVisit, 
  onEndVisit, 
  hasActiveVisit,
  isLoading = false
}: ClientVisitActionsProps) => {
  const handleStartVisit = () => {
    onStartVisit();
  };

  const handleEndVisit = () => {
    onEndVisit();
  };

  return (
    <div className="space-y-2">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          onClick={handleStartVisit}
          disabled={hasActiveVisit || isLoading}
          className="h-12 flex flex-col gap-1"
          variant={hasActiveVisit ? "outline" : "default"}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-xs">
            {hasActiveVisit ? "Sudah Mulai" : "Mulai Kunjungan"}
          </span>
        </Button>
        
        <Button 
          onClick={handleEndVisit}
          disabled={!hasActiveVisit || isLoading}
          className="h-12 flex flex-col gap-1"
          variant={!hasActiveVisit ? "outline" : "destructive"}
        >
          <Clock className="h-5 w-5" />
          <span className="text-xs">
            {!hasActiveVisit ? "Belum Mulai" : "Selesai Kunjungan"}
          </span>
        </Button>
      </div>
    </div>
  );
};