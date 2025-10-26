
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Clock, Settings, CheckCircle } from 'lucide-react';
import { useCurrentUserEmployee } from './SectionGreetingsImport/useCurrentUserEmployee';
import { useAttendanceStatus } from './AttendanceStatusProvider';
import { useUserData } from './SectionGreetingsImport/useUserData';

interface SectionGreetingsProps {
  currentTime: Date;
  greeting: string;
}

export const SectionGreetings = ({ currentTime, greeting }: SectionGreetingsProps) => {
  const { data: employeeData, isLoading } = useCurrentUserEmployee();
  const { hasCheckedIn, hasCheckedOut, todayRecord } = useAttendanceStatus();
  const { profile } = useUserData();
  const [currentSlide, setCurrentSlide] = useState(0);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calculate working time if checked in
  const calculateWorkingTime = () => {
    if (!todayRecord?.check_in_time) return "0 jam 0 menit";
    
    const checkIn = new Date(todayRecord.check_in_time);
    const now = new Date();
    
    const diffMs = now.getTime() - checkIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} jam ${minutes} menit`;
  };

  // Use profile name from header data source, same as header components
  const displayName = profile?.full_name || employeeData?.profile_name || employeeData?.full_name || 'User';

  // Auto-slide between welcome and working status
  useEffect(() => {
    if (hasCheckedIn && !hasCheckedOut) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => prev === 0 ? 1 : 0);
      }, 5000); // Switch every 5 seconds
      
      return () => clearInterval(interval);
    } else {
      setCurrentSlide(0); // Always show welcome when not working
    }
  }, [hasCheckedIn, hasCheckedOut]);

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            {/* Sliding content */}
            <div className="relative">
              {/* Welcome slide */}
              <div className={`transition-all duration-500 ${currentSlide === 0 ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-full absolute inset-0'}`}>
                <h2 className="text-xl font-bold text-white mb-3 leading-tight">
                  {greeting}, {displayName}! 👋
                </h2>
                <p className="text-blue-100 text-xs leading-relaxed">Jangan lupa untuk absen hari ini!</p>
              </div>

              {/* Working status slide */}
              {hasCheckedIn && !hasCheckedOut && (
                <div className={`transition-all duration-500 ${currentSlide === 1 ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full absolute inset-0'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-6 w-6 text-green-300" />
                    <h2 className="text-xl font-bold text-white leading-tight">
                      Anda Sedang Bekerja
                    </h2>
                  </div>
                  <p className="text-blue-100 text-xs leading-relaxed">
                    Waktu kerja hari ini: {calculateWorkingTime()}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 text-xs mt-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="leading-normal">{formatTime(currentTime)}</span>
          </div>
          <div>
            {currentTime.toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
