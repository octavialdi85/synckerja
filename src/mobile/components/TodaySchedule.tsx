import { Clock, Users, MapPin, AlertCircle } from "lucide-react";

interface TodayScheduleProps {
  schedule: {
    startTime: string;
    endTime: string;
    location: string;
    department: string;
    notes?: string;
    isWorkingDay?: boolean;
    isHoliday?: boolean;
    holidayName?: string | null;
  };
}

export const TodaySchedule = ({ schedule }: TodayScheduleProps) => {
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const isCurrentlyWorkTime = () => {
    if (schedule.isHoliday) {
      return {
        status: "holiday",
        message: schedule.holidayName ? `Hari libur: ${schedule.holidayName}` : "Hari ini libur",
      };
    }

    if (schedule.isWorkingDay === false) {
      return {
        status: "off",
        message: "Tidak ada jadwal kerja untuk hari ini",
      };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  const getTimeStatus = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    
    if (currentTime < startTime) {
      const diff = startTime - currentTime;
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return {
        status: 'upcoming',
        message: `Jam kerja dimulai dalam ${hours > 0 ? `${hours}h ` : ''}${minutes}m`
      };
    } else if (isCurrentlyWorkTime()) {
      return {
        status: 'active',
        message: 'Sedang dalam jam kerja'
      };
    } else {
      return {
        status: 'completed',
        message: 'Jam kerja telah selesai'
      };
    }
  };

  const timeStatus = getTimeStatus();
  const statusColor =
    timeStatus.status === "active"
      ? "bg-success/10 border-success/30 text-success"
      : timeStatus.status === "upcoming"
        ? "bg-warning/10 border-warning/30 text-warning"
        : timeStatus.status === "holiday"
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : timeStatus.status === "off"
            ? "bg-muted/50 border-border text-muted-foreground"
            : "bg-muted/50 border-border text-muted-foreground";

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Jadwal Hari Ini</h3>
      </div>
      
      {/* Time Status */}
      <div className={`p-3 rounded-lg mb-3 border ${statusColor}`}>
        <div className="flex items-center gap-2">
          {timeStatus.status === 'upcoming' && <AlertCircle className="h-4 w-4" />}
          {timeStatus.status === 'active' && <Clock className="h-4 w-4" />}
          {timeStatus.status === 'holiday' && <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">{timeStatus.message}</span>
        </div>
      </div>

      {/* Schedule Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Jam Kerja</span>
          <span className="text-sm font-medium text-foreground">
            {timeStatus.status === "holiday" || timeStatus.status === "off"
              ? "-"
              : `${schedule.startTime} - ${schedule.endTime}`}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lokasi</span>
          <div className="flex items-center gap-1 text-right">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground text-right">{schedule.location}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Departemen</span>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{schedule.department}</span>
          </div>
        </div>

        {schedule.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">{schedule.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};