import { Card } from "@/mobile/components/ui/card";
import { ScrollArea } from "@/mobile/components/ui/scroll-area";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  is_late: boolean;
  late_minutes: number;
  working_hours_minutes: number;
  penalties: {
    penalty_amount: number;
    penalty_reason: string;
    status: string;
  }[];
}

interface AttendanceHistoryTableProps {
  attendanceHistory: AttendanceRecord[];
  loading: boolean;
  error: string | null;
}

export const AttendanceHistoryTable = ({
  attendanceHistory,
  loading,
  error
}: AttendanceHistoryTableProps) => {
  const formatTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return "-";
    return format(new Date(dateTimeString), "HH:mm");
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM", {
      locale: id
    });
  };

  const getStatusText = (record: AttendanceRecord) => {
    if (!record.check_in_time) return "Tidak Hadir";
    if (record.is_late) return "Terlambat";
    if (record.status === "present") return "Hadir";
    return record.status || "Hadir";
  };

  const getTotalPenalty = (penalties: AttendanceRecord['penalties']) => {
    if (!penalties || penalties.length === 0) return "•";
    const total = penalties.reduce((sum, penalty) => sum + (penalty.penalty_amount || 0), 0);
    return `Rp ${Math.round(total).toLocaleString('id-ID')}`;
  };

  return <Card className="mb-4 bg-gradient-card border border-border">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-foreground">History Absensi</h3>
      </div>
      
      <div className="p-3">
        {/* Mobile and Desktop Responsive Table */}
        <div className="w-full overflow-x-auto">
          {/* Table Header */}
          <div className="flex text-xs font-medium text-muted-foreground mb-2 pb-2 border-b border-border gap-2">
            <div className="flex-shrink-0" style={{
            flexBasis: '12%'
          }}>Date</div>
            <div className="flex-shrink-0" style={{
            flexBasis: '10%'
          }}>In</div>
            <div className="flex-shrink-0" style={{
            flexBasis: '10%'
          }}>Out</div>
            <div className="flex-shrink-0" style={{
            flexBasis: '18%'
          }}>Status</div>
            <div className="flex-shrink-0 text-center" style={{
            flexBasis: '12%'
          }}>Min</div>
            <div className="flex-shrink-0 text-center px-2" style={{
            flexBasis: '100px'
          }}>Penalty</div>
          </div>
          
          {/* Table Body with ScrollArea - Fixed height */}
          <ScrollArea className="h-48">
            <div className="w-full">
              {loading ? <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Memuat data...</div>
                </div> : error ? <div className="text-center py-4">
                  <div className="text-sm text-destructive">Error: {error}</div>
                </div> : attendanceHistory.length === 0 ? <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Belum ada data absensi untuk periode ini</div>
                </div> : <div className="space-y-2 pr-2">
                  {attendanceHistory.map(record => {
                const status = getStatusText(record);
                const penalty = getTotalPenalty(record.penalties);
                const lateMinutes = record.is_late && record.late_minutes ? `${record.late_minutes}m` : "-";
                return <div key={record.id} className="flex text-xs border-b border-border/50 last:border-b-0 items-center gap-2 py-0">
                        <div className="flex-shrink-0 text-foreground truncate" style={{
                    flexBasis: '12%'
                  }} title={formatDate(record.attendance_date)}>
                          {formatDate(record.attendance_date)}
                        </div>
                        <div className="flex-shrink-0 text-foreground truncate" style={{
                    flexBasis: '10%'
                  }} title={formatTime(record.check_in_time)}>
                          {formatTime(record.check_in_time)}
                        </div>
                        <div className="flex-shrink-0 text-foreground truncate" style={{
                    flexBasis: '10%'
                  }} title={formatTime(record.check_out_time)}>
                          {formatTime(record.check_out_time)}
                        </div>
                        <div className="flex-shrink-0" style={{
                    flexBasis: '18%'
                  }}>
                          <div className={`text-xs px-1.5 py-0.5 rounded text-center inline-block max-w-full truncate ${status === "Hadir" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : status === "Terlambat" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" : status === "Pulang Awal" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`} title={status}>
                            {status}
                          </div>
                        </div>
                        <div className={`flex-shrink-0 font-medium text-center ${lateMinutes === "-" ? "text-muted-foreground" : "text-warning"}`} style={{
                    flexBasis: '12%'
                  }} title={lateMinutes}>
                          {lateMinutes}
                        </div>
                        <div className={`flex-shrink-0 font-semibold px-2 ${penalty === "•" ? "text-muted-foreground" : "text-destructive"}`} style={{
                    flexBasis: '100px'
                  }}>
                          {penalty}
                        </div>
                      </div>;
              })}
                </div>}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>;
};
