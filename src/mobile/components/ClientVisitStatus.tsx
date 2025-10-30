import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User } from "lucide-react";

interface ClientVisitStatusProps {
  startTime?: string;
  endTime?: string;
  currentClient?: string;
  visitDuration?: string;
}

export const ClientVisitStatus = ({ 
  startTime, 
  endTime, 
  currentClient, 
  visitDuration 
}: ClientVisitStatusProps) => {
  return (
    <div className="px-3 mb-4">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Mulai Kunjungan</span>
              </div>
              <span className="text-sm font-medium">
                {startTime || '-'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Selesai Kunjungan</span>
              </div>
              <span className="text-sm font-medium">
                {endTime || '-'}
              </span>
            </div>
            
            {currentClient && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Client Aktif</span>
                </div>
                <span className="text-sm font-medium">
                  {currentClient}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Durasi Kunjungan</span>
              </div>
              <span className="text-sm font-medium text-primary">
                {visitDuration || '0 jam 0 menit'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};