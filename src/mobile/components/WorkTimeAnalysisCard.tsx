import { Card } from "@/mobile/components/ui/card";
import { Clock } from "lucide-react";

interface WorkTimeAnalysisCardProps {
  avgCheckIn: string;
  avgCheckOut: string;
  workingHours: number;
  workingMinutesRemainder: number;
}

export const WorkTimeAnalysisCard = ({ 
  avgCheckIn, 
  avgCheckOut, 
  workingHours,
  workingMinutesRemainder
}: WorkTimeAnalysisCardProps) => {
  return (
    <Card className="mb-4 bg-gradient-card border border-border">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Analisis Waktu Kerja</h2>
        </div>
      </div>
      <div className="p-3">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-muted-foreground">Rata-rata masuk</span>
          <span className="text-xs font-medium text-foreground">{avgCheckIn}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-muted-foreground">Rata-rata pulang</span>
          <span className="text-xs font-medium text-foreground">{avgCheckOut}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">Total jam kerja</span>
          <span className="text-xs font-medium text-primary">
            {workingHours > 0 || workingMinutesRemainder > 0 
              ? `${workingHours} jam ${workingMinutesRemainder} menit`
              : "0 jam"
            }
          </span>
        </div>
      </div>
    </Card>
  );
};