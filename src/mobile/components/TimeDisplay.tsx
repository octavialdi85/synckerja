import { useEffect, useState } from "react";

export const TimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="text-center py-6 px-4">
      <div className="text-5xl font-bold text-foreground mb-2 font-mono tracking-tight">
        {formatTime(currentTime)}
      </div>
      <div className="text-base text-muted-foreground">
        {formatDate(currentTime)}
      </div>
    </div>
  );
};