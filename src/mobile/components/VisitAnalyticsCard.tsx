import { Card, CardContent, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Users, Clock, CheckCircle2 } from "lucide-react";

interface VisitAnalyticsCardProps {
  totalVisits: number;
  completedVisits: number;
  averageDuration: number;
  upcomingVisits: number;
  periodLabel: string; // Label untuk periode yang dipilih (e.g., "Hari Ini", "Bulan Ini", dll)
}

export const VisitAnalyticsCard = ({ 
  totalVisits, 
  completedVisits, 
  averageDuration, 
  upcomingVisits,
  periodLabel 
}: VisitAnalyticsCardProps) => {
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;
  const averageHours = Math.floor(averageDuration / 60);
  const averageMinutes = averageDuration % 60;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Analisis Kunjungan {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {/* Total Kunjungan */}
          <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">Total</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{totalVisits}</span>
              <span className="text-xs text-muted-foreground">kunjungan</span>
            </div>
          </div>
            
          {/* Kunjungan Selesai */}
          <div className="bg-success/5 rounded-lg p-2 border border-success/20">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs font-medium text-success">Selesai</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{completedVisits}</span>
              <span className="text-xs text-muted-foreground">dari {totalVisits}</span>
            </div>
          </div>
            
          {/* Tingkat Penyelesaian */}
          <div className="bg-accent/5 rounded-lg p-2 border border-accent/20">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-accent-foreground" />
              <span className="text-xs font-medium text-accent-foreground">Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{completionRate}%</span>
              <span className="text-xs text-muted-foreground">selesai</span>
            </div>
          </div>
            
          {/* Durasi Rata-rata */}
          <div className="bg-muted/50 rounded-lg p-2 border border-border">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Durasi</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">
                {averageHours > 0 ? `${averageHours}j ` : ''}{averageMinutes}m
              </span>
              <span className="text-xs text-muted-foreground">rata-rata</span>
            </div>
          </div>
        </div>
          
        {/* Upcoming Visits Section */}
        {upcomingVisits > 0 && (
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Kunjungan Mendatang</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {upcomingVisits} terjadwal
              </Badge>
            </div>
          </div>
        )}
          
        {/* Performance Indicator */}
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Performa</span>
            <div className="flex items-center gap-1">
              {completionRate >= 80 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-sm font-medium text-success">Excellent</span>
                </>
              ) : completionRate >= 60 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium text-primary">Good</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Needs Improvement</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};