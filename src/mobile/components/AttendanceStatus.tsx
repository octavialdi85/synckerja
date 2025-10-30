
import { useEffect, useState } from "react";

interface AttendanceStatusProps {
  checkIn?: string;
  checkOut?: string;
  workingHours: string;
}

export const AttendanceStatus = ({ checkIn, checkOut, workingHours }: AttendanceStatusProps) => {
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    // Jika sudah clock out, tampilkan pesan selamat
    if (checkOut) {
      setElapsedTime("Hati Hati Di Jalan, Selamat Istirahat");
      return;
    }

    if (!checkIn) {
      setElapsedTime("");
      return;
    }

    const updateElapsedTime = () => {
      if (!checkIn || checkOut) {
        return;
      }

      try {
        const now = new Date();

        // Jika format waktu-only (HH:mm:ss atau HH.mm.ss), hitung selisih berbasis detik harian
        const timeOnly = checkIn.match(/^(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})$/);

        let hoursDiff = 0;
        let minutes = 0;
        let seconds = 0;

        if (timeOnly) {
          const [, hStr, mStr, sStr] = timeOnly;
          const h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);
          const s = parseInt(sStr, 10);

          const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
          const checkSec = h * 3600 + m * 60 + s;

          let diffSec = nowSec - checkSec;
          if (diffSec < 0) diffSec += 24 * 3600; // melewati tengah malam

          hoursDiff = Math.floor(diffSec / 3600); // biarkan > 23 jika kerja > 24 jam
          minutes = Math.floor((diffSec % 3600) / 60);
          seconds = diffSec % 60;
        } else {
          // Coba parse sebagai datetime penuh
          const parsed = new Date(checkIn);
          if (isNaN(parsed.getTime())) {
            setElapsedTime("");
            return;
          }

          let diffMs = now.getTime() - parsed.getTime();
          if (diffMs < 0) diffMs = 0; // jika masa depan, tampilkan 00:00:00

          hoursDiff = Math.floor(diffMs / (1000 * 60 * 60));
          minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        }

        const formattedTime = `${String(hoursDiff).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        setElapsedTime(`Clock In ${formattedTime} ago`);
      } catch (error) {
        console.error('Error calculating elapsed time:', error);
        setElapsedTime("");
      }
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [checkIn, checkOut]);

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Check In</p>
          <p className="text-lg font-semibold text-foreground">
            {checkIn || '--:--:--'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Check Out</p>
          <p className="text-lg font-semibold text-foreground">
            {checkOut || '--:--:--'}
          </p>
        </div>
      </div>
      
      <div className="bg-primary rounded-lg px-4 py-2">
        <p className="text-center text-primary-foreground font-medium">
          {elapsedTime || workingHours}
        </p>
      </div>
    </div>
  );
};
