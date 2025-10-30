import { Card } from "@/mobile/components/ui/card";

interface DetailedStatsCardProps {
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalOvertime: number;
  statsLoading: boolean;
}

export const DetailedStatsCard = ({ 
  presentDays, 
  lateDays, 
  absentDays, 
  totalOvertime, 
  statsLoading 
}: DetailedStatsCardProps) => {
  return (
    <Card className="bg-gradient-card border border-border">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-foreground">Statistik Periode Dipilih</h2>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Masuk</span>
          <span className="font-semibold text-foreground">
            {statsLoading ? "-" : presentDays || 0} hari
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Terlambat</span>
          <span className="font-semibold text-warning">
            {statsLoading ? "-" : lateDays || 0} hari
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tidak Hadir</span>
          <span className="font-semibold text-destructive">
            {statsLoading ? "-" : absentDays || 0} hari
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Lembur</span>
          <span className="font-semibold text-primary">{totalOvertime} jam</span>
        </div>
      </div>
    </Card>
  );
};